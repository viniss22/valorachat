import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const confirmSchema = z.object({
  amount: z.number().positive().max(99999999),
  category: z.string().trim().min(1).max(60),
  type: z.enum(["receita", "despesa"]),
  description: z.string().trim().max(200).default(""),
});

export const Route = createFileRoute("/api/capture/confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { resolveUserId, insertTransaction, summary } = await import(
          "@/lib/capture.server"
        );

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

        const parsed = confirmSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({
            status: "error",
            hint: parsed.error.issues[0]?.message ?? "Dados inválidos.",
          });
        }

        try {
          const inserted = await insertTransaction(userId, parsed.data);
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
            summary: summary(parsed.data.type, parsed.data.amount, inserted.category, inserted.description),
          });
        } catch (err) {
          const hint = err instanceof Error ? err.message : "Erro ao registrar.";
          return Response.json({ status: "error", hint });
        }
      },
    },
  },
});