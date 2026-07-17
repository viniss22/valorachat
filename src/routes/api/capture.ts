import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseFinanceMessage, type ParseResult } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const EXPENSE_CATEGORIES = [
  "Alimentação", "Moradia", "Transporte", "Lazer", "Saúde",
  "Educação", "Assinaturas", "Compras", "Outros",
] as const;

const INCOME_CATEGORIES = [
  "Salário", "Honorários", "Dividendos", "Aluguéis", "Vendas", "Outros",
] as const;

const captureSchema = z.object({
  text: z.string().trim().min(1, "Mensagem vazia").max(280, "Máximo 280 caracteres"),
});

function normalizeCategory(type: "receita" | "despesa", category: string): string {
  const allowed = type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if ((allowed as readonly string[]).includes(category)) return category;
  return "Outros";
}

function summary(kind: "receita" | "despesa", amount: number, category: string, description?: string) {
  const sinal = kind === "despesa" ? "−" : "+";
  const desc = description ? ` (${description})` : "";
  return `${sinal}${BRL.format(amount)} em ${category}${desc}`;
}

async function resolveUserId(authHeader: string | null): Promise<string | null> {
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

async function insertTransaction(
  userId: string,
  parsed: { amount: number; category: string; type: "receita" | "despesa"; description: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date().toISOString().slice(0, 10);
  const category = normalizeCategory(parsed.type, parsed.category);
  const amountCents = Math.round(parsed.amount * 100);
  const description = (parsed.description || category).slice(0, 200);

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: userId,
      kind: parsed.type,
      amount_cents: amountCents,
      category,
      description,
      transaction_date: today,
      payment_method: "outro",
      installments_total: 1,
      installment_number: 1,
      source: "app_chat",
    })
    .select("id, kind, amount_cents, category, description, transaction_date")
    .single();

  if (insertErr || !inserted) {
    throw insertErr ?? new Error("Falha ao inserir transação");
  }

  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    action: "app_chat.transaction_created",
    entity: "transaction",
    entity_id: inserted.id,
    metadata: {
      source: "app_chat",
      amount_cents: amountCents,
      category,
      kind: parsed.type,
    },
  });

  return { inserted, category, amount: parsed.amount };
}

export const Route = createFileRoute("/api/capture")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await resolveUserId(request.headers.get("authorization"));
        if (!userId) {
          return new Response(JSON.stringify({ status: "error", hint: "Sessão expirada." }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
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
        const startedAt = Date.now();
        let result: ParseResult;
        try {
          result = await parseFinanceMessage(text);
        } catch (err) {
          const hint = err instanceof Error ? err.message : "Não consegui interpretar.";
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("audit_logs").insert({
            user_id: userId,
            action: "app_chat.parse_failed",
            entity: "ai",
            metadata: { text, error: hint },
          });
          return Response.json({ status: "error", hint });
        }
        const latencyMs = Date.now() - startedAt;

        // Log AI processing (best-effort)
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("ai_processing_logs").insert({
            user_id: userId,
            message_text: text,
            model: "gpt-4-turbo",
            confidence: result.confidence,
            extracted_json: result as unknown as never,
            latency_ms: latencyMs,
          });
        } catch (err) {
          console.error("[capture] falha ao logar ai_processing_logs", err);
        }

        // Low confidence → reject
        if (result.confidence < 0.5) {
          return Response.json({
            status: "rejected",
            hint: "Tente algo como: 'gastei 50 no almoço' ou 'recebi 200 do João'",
          });
        }

        // Medium confidence → ask for confirmation
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

        // High confidence → create directly
        try {
          const { inserted, category } = await insertTransaction(userId, {
            amount: result.amount,
            category: result.category,
            type: result.type,
            description: result.description,
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
            summary: summary(result.type, result.amount, category, result.description),
          });
        } catch (err) {
          const hint = err instanceof Error ? err.message : "Erro ao registrar.";
          return Response.json({ status: "error", hint });
        }
      },
    },
  },
});

export { resolveUserId, insertTransaction, summary, normalizeCategory };