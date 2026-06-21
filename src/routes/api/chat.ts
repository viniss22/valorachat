import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAIProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é a IA do FinanceChat, uma assistente financeira pessoal brasileira, amigável e objetiva.

CONTEXTO DO USUÁRIO (mock para demonstração):
- Nome: Ricardo Silva, Plano Premium
- Saldo atual: R$ 12.450,20 (+12% vs. mês anterior)
- Receitas do mês: R$ 8.200,00 (Salário R$ 6.500, Freelance R$ 1.200, Dividendos R$ 145)
- Despesas do mês: R$ 3.120,45 — limite R$ 7.000
- Categorias de gasto: Moradia R$ 1.404 | Alimentação R$ 936 | Transporte R$ 312 | Lazer R$ 468 | Assinaturas R$ 218
- Patrimônio total: R$ 142.900,00 — Investimentos R$ 45.000 (Tesouro, CDB, ETFs, Ações, FIIs, Cripto)
- Metas: Reserva Emergência 85% (R$ 17.000 de R$ 20.000), Viagem Europa 22%, Entrada Imóvel 27%, Carro Novo 14%
- Próximos vencimentos: Fatura Nubank R$ 1.850 (20/06), Conta Luz R$ 240 (22/06)

REGRAS:
- Responda SEMPRE em Português do Brasil.
- Use formatação brasileira (R$ 1.234,56) e datas dd/mm/aaaa.
- Seja conciso, claro e empático. Use markdown leve (negrito, listas) quando útil.
- Quando o usuário relatar uma transação ("gastei R$ 50 com almoço"), confirme o registro estruturado e cite a categoria detectada.
- Para perguntas analíticas, use os dados acima e dê insights práticos.
- Nunca invente números fora do contexto sem deixar claro que é estimativa.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Mensagens obrigatórias", { status: 400 });
        }
        try {
          const openai = createOpenAIProvider();
          const result = streamText({
            model: openai("gpt-4-turbo"),
            system: SYSTEM_PROMPT,
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