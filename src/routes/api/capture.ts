import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const captureSchema = z.object({
  text: z.string().trim().min(1, "Mensagem vazia").max(280, "Máximo 280 caracteres"),
});

export const Route = createFileRoute("/api/capture")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          resolveUserId,
          runParse,
          insertTransaction,
          normalizeCategory,
          summary,
          logAi,
          logAudit,
          BRL,
        } = await import("@/lib/capture.server");

        const userId = await resolveUserId(request.headers.get("authorization"));
        if (!userId) {
          return new Response(
            JSON.stringify({ status: "error", hint: "Sessão expirada. Faça login novamente." }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ status: "error", hint: "Requisição inválida." });
        }

        const parsedBody = captureSchema.safeParse(body);
        if (!parsedBody.success) {
          return Response.json({
            status: "error",
            hint: parsedBody.error.issues[0]?.message ?? "Mensagem inválida.",
          });
        }

        const text = parsedBody.data.text;
        // Proteção de custo: toda chamada abaixo consome a API da OpenAI.
        const { checkAiRateLimit, incrementUsage } = await import("@/lib/rate-limit.server");
        const limite = await checkAiRateLimit(userId);
        if (!limite.allowed) {
          return Response.json({ status: "error", hint: limite.hint });
        }
        const { saveMessage } = await import("@/lib/chat-history.server");
        await saveMessage({ userId, role: "user", content: text });

        const startedAt = Date.now();
        let result;
        try {
          result = await runParse(text);
        } catch (err) {
          const hint = err instanceof Error ? err.message : "Não consegui interpretar.";
          await logAudit(userId, "app_chat.parse_failed", { text, error: hint });
          return Response.json({ status: "error", hint });
        }
        const latencyMs = Date.now() - startedAt;
        await logAi(userId, text, result, latencyMs);
        await incrementUsage(userId, "ai_parse_calls");

        if (result.confidence < 0.5) {
          return Response.json({
            status: "rejected",
            hint: "Tente algo como: \"gastei 50 no almoço\" ou \"recebi 200 do João\".",
          });
        }

        if (result.confidence < 0.8) {
          const category = normalizeCategory(result.type, result.category);
          return Response.json({
            status: "needs_confirmation",
            parsed: {
              amount: result.amount,
              category,
              type: result.type,
              description: result.description,
            },
            summary: `${BRL.format(result.amount)} em ${category}${result.description ? ` (${result.description})` : ""}`,
          });
        }

        try {
          const inserted = await insertTransaction(userId, {
            amount: result.amount,
            category: result.category,
            type: result.type,
            description: result.description,
          });
          const resumo = summary(
            result.type,
            result.amount,
            inserted.category,
            inserted.description,
          );
          await saveMessage({
            userId,
            role: "assistant",
            content: resumo,
            kind: "capture",
            captureStatus: "created",
            transactionId: inserted.id,
          });
          return Response.json({
            status: "created",
            transaction: {
              id: inserted.id,
              kind: inserted.kind,
              amount: inserted.amount_cents / 100,
              category: inserted.category,
              description: inserted.description,
              transaction_date: inserted.transaction_date,
            },
            summary: resumo,
          });
        } catch (err) {
          const hint = err instanceof Error ? err.message : "Erro ao registrar.";
          return Response.json({ status: "error", hint });
        }
      },
    },
  },
});
