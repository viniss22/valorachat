import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createOpenAIProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NEUTRAL_PROMPT = `Você é a IA do Finora, assistente financeira pessoal em Português do Brasil.
O usuário ainda não tem transações registradas. Incentive-o a começar enviando gastos pelo WhatsApp
ou cadastrando manualmente em Receitas/Despesas. Seja breve, empática e use formatação R$ 1.234,56.`;

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
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
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

  return `Você é a IA do Finora, assistente financeira.

DADOS REAIS DO USUÁRIO (mês atual):
- Nome: ${nome}
- Receitas: ${BRL.format(receitasCents / 100)}
- Despesas: ${BRL.format(despesasCents / 100)}
- Saldo: ${BRL.format(saldoCents / 100)}
- Top categorias: ${topCategorias || "(sem despesas categorizadas)"}
- Metas: ${metas || "(nenhuma meta cadastrada)"}

REGRAS: responda sempre em Português do Brasil, use formato R$ 1.234,56 e datas dd/mm/aaaa,
seja conciso e empático. Use APENAS os dados acima. Se não souber algo, diga claramente
que não tem essa informação. Nunca invente valores.`;
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
        const system = await getSystemPrompt(userId);

        try {
          const openai = createOpenAIProvider();
          const result = streamText({
            model: openai("gpt-4-turbo"),
            system,
            messages: await convertToModelMessages(messages),
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