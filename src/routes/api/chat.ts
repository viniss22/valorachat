import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createOpenAIProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NEUTRAL_PROMPT = `Você é a IA do Valora, assistente financeira pessoal em Português do Brasil.
O usuário ainda não tem transações registradas. Incentive-o a começar escrevendo aqui mesmo,
em linguagem natural (ex.: "gastei 50 no almoço"), ou pelo botão + em Receitas/Despesas.
Seja breve, empática e use formatação R$ 1.234,56.
IMPORTANTE: você não é consultora de investimentos credenciada — não recomende
produtos financeiros específicos nem alocação de carteira.`;

const FALLBACK_PROMPT = `Você é a IA do Finora, assistente financeira pessoal em Português do Brasil.
Não foi possível carregar os dados do usuário agora. Seja útil de forma genérica, empática e concisa;
quando não souber algo específico do usuário, diga que não tem o dado no momento.`;

// --- Cache simples em memória por userId (60s) ---------------------------
interface CachedPrompt {
  prompt: string;
  expiresAt: number;
}
const promptCache = new Map<string, CachedPrompt>();
const CACHE_TTL_MS = 60_000;

async function resolveUserId(
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL;
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) return null;

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  try {
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

async function buildUserContext(userId: string): Promise<string> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  const [profileRes, txRes, goalsRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("transactions")
      .select("kind, amount_cents, category")
      .eq("user_id", userId)
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth),
    supabaseAdmin
      .from("goals")
      .select("title, target_cents, accumulated_cents")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const nome = profileRes.data?.full_name?.trim() || "usuário";
  const txs = txRes.data ?? [];

  if (txs.length === 0) {
    return NEUTRAL_PROMPT.replace("O usuário", `${nome}, o usuário`);
  }

  let receitasCents = 0;
  let despesasCents = 0;
  const byCategory = new Map<string, number>();

  for (const t of txs) {
    if (t.kind === "receita") {
      receitasCents += t.amount_cents;
    } else {
      despesasCents += t.amount_cents;
      byCategory.set(
        t.category,
        (byCategory.get(t.category) ?? 0) + t.amount_cents,
      );
    }
  }

  const saldoCents = receitasCents - despesasCents;
  const topCategorias = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, cents]) => `${cat}: ${BRL.format(cents / 100)}`)
    .join(" | ");

  const metas = (goalsRes.data ?? [])
    .map((g) => {
      const pct =
        g.target_cents > 0
          ? Math.min(100, Math.round((g.accumulated_cents / g.target_cents) * 100))
          : 0;
      return `${g.title}: ${pct}% (${BRL.format(g.accumulated_cents / 100)} de ${BRL.format(g.target_cents / 100)})`;
    })
    .join(" | ");

  const saldoPositivo = saldoCents >= 0;
  const taxaPoupanca =
    receitasCents > 0 ? Math.round((saldoCents / receitasCents) * 100) : 0;

  return `Você é a IA do Valora, assistente financeira.

DADOS REAIS DO USUÁRIO (mês atual):
- Nome: ${nome}
- Total que ENTROU (receitas): ${BRL.format(receitasCents / 100)}
- Total que SAIU (despesas): ${BRL.format(despesasCents / 100)}
- SALDO DO MÊS: ${BRL.format(Math.abs(saldoCents) / 100)} ${saldoPositivo ? "POSITIVO (sobrou dinheiro — as receitas superam as despesas)" : "NEGATIVO (faltou dinheiro — as despesas superam as receitas)"}
- Taxa de poupança: ${taxaPoupanca}% da renda${saldoPositivo && taxaPoupanca >= 20 ? " (acima da média brasileira)" : ""}
- Top categorias de gasto: ${topCategorias || "(sem despesas categorizadas)"}
- Metas: ${metas || "(nenhuma meta cadastrada)"}

INTERPRETAÇÃO CORRETA DOS NÚMEROS (leia com atenção):
- O saldo JÁ ESTÁ CALCULADO acima. NÃO recalcule.
- NUNCA descreva o valor das despesas como "saldo negativo". São coisas
  diferentes: despesa é o quanto saiu; saldo é o que sobrou depois.
- Só afirme que a situação é negativa se o SALDO DO MÊS estiver marcado
  como NEGATIVO acima. Neste momento ele está ${saldoPositivo ? "POSITIVO" : "NEGATIVO"}.
- Se o saldo é positivo, reconheça isso antes de sugerir ajustes.

REGRAS: responda sempre em Português do Brasil, use formato R$ 1.234,56 e datas dd/mm/aaaa,
seja concisa e empática. Use APENAS os dados acima. Se não souber algo, diga claramente
que não tem essa informação. Nunca invente valores.

IMPORTANTE — LIMITE LEGAL: você NÃO é consultora de investimentos credenciada.
Pode explicar conceitos, projetar cenários com os dados do usuário e organizar
metas. NÃO recomende produtos financeiros específicos (ações, fundos, CDBs,
criptomoedas), não sugira alocação de carteira e não diga o que "vale a pena"
comprar. Se perguntarem, explique que não pode recomendar investimentos e
sugira procurar um profissional certificado.`;
}

async function getSystemPrompt(userId: string | null): Promise<string> {
  if (!userId) return FALLBACK_PROMPT;

  const cached = promptCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.prompt;

  try {
    const prompt = await buildUserContext(userId);
    promptCache.set(userId, { prompt, expiresAt: Date.now() + CACHE_TTL_MS });
    return prompt;
  } catch (err) {
    console.error("[chat] falha ao montar contexto do usuário", err);
    return FALLBACK_PROMPT;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as {
          messages?: UIMessage[];
        };
        if (!Array.isArray(messages)) {
          return new Response("Mensagens obrigatórias", { status: 400 });
        }

        const userId = await resolveUserId(request.headers.get("authorization"));

        // Proteção de custo: o streaming abaixo consome a API da OpenAI.
        if (userId) {
          const { checkAiRateLimit, incrementUsage } = await import(
            "@/lib/rate-limit.server"
          );
          const limite = await checkAiRateLimit(userId);
          if (!limite.allowed) {
            return new Response(limite.hint ?? "Limite diário atingido.", {
              status: 429,
            });
          }
          await incrementUsage(userId, "ai_parse_calls");
        }

        const system = await getSystemPrompt(userId);

        try {
          const openai = createOpenAIProvider();
          const { saveMessage, loadContext } = await import(
            "@/lib/chat-history.server"
          );

          // Texto da última pergunta do usuário (para salvar no histórico).
          const ultima = messages[messages.length - 1];
          const perguntaUsuario =
            ultima?.parts
              ?.map((p) => (p.type === "text" ? p.text : ""))
              .join("")
              .trim() ?? "";

          // Conversas anteriores entram como contexto para a IA entender
          // perguntas de acompanhamento ("e comparado ao mês passado?").
          const anteriores = userId ? await loadContext(userId) : [];

          if (userId && perguntaUsuario) {
            await saveMessage({ userId, role: "user", content: perguntaUsuario });
          }

          const result = streamText({
            model: openai("gpt-4o-mini"),
            system,
            messages: [
              ...anteriores.map((m) => ({ role: m.role, content: m.content })),
              ...(await convertToModelMessages(messages)),
            ],
            // Grava a resposta completa assim que o streaming termina.
            onFinish: async ({ text }) => {
              if (userId && text.trim()) {
                await saveMessage({ userId, role: "assistant", content: text });
              }
            },
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro desconhecido";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});