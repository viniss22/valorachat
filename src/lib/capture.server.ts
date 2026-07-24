import { createClient } from "@supabase/supabase-js";
import {
  BUSINESS_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  parseFinanceMessage,
  type ParseResult,
} from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Categorias vêm de ai-gateway.server para haver uma única fonte de verdade.
// Antes estavam duplicadas aqui, o que gerou divergência ("Outro" vs "Outros").

export function normalizeCategory(
  type: "receita" | "despesa",
  category: string,
  scope: "pessoal" | "empresa" = "pessoal",
): string {
  const allowed =
    type === "receita"
      ? INCOME_CATEGORIES
      : scope === "empresa"
        ? [...BUSINESS_CATEGORIES, ...EXPENSE_CATEGORIES]
        : EXPENSE_CATEGORIES;

  if ((allowed as readonly string[]).includes(category)) return category;

  // Fallback. Atenção: a categoria válida é "Outro" (singular) — antes esta
  // função devolvia "Outros", criando duas categorias distintas no banco.
  return type === "receita"
    ? "Vendas"
    : scope === "empresa"
      ? "Insumos e mercadorias"
      : "Outro";
}

export function summary(kind: "receita" | "despesa", amount: number, category: string, description?: string) {
  const sinal = kind === "despesa" ? "−" : "+";
  const desc = description ? ` (${description})` : "";
  return `${sinal}${BRL.format(amount)} em ${category}${desc}`;
}

export async function resolveUserId(authHeader: string | null): Promise<string | null> {
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

export interface InsertInput {
  amount: number;
  category: string;
  type: "receita" | "despesa";
  description: string;
  /** Pessoal (padrão) ou do negócio, para MEI/autônomo. */
  scope?: "pessoal" | "empresa";
}

export async function insertTransaction(userId: string, parsed: InsertInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Data no fuso de São Paulo (UTC-3). Usar toISOString() puro gravava o dia
  // seguinte para lançamentos feitos após 21h no Brasil (já era outro dia em UTC).
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  )
    .toISOString()
    .slice(0, 10);
  const scope = parsed.scope === "empresa" ? "empresa" : "pessoal";
  const category = normalizeCategory(parsed.type, parsed.category, scope);
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
      scope,
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

  return inserted;
}

export async function runParse(text: string): Promise<ParseResult> {
  return parseFinanceMessage(text);
}

export async function logAi(
  userId: string,
  text: string,
  result: ParseResult,
  latencyMs: number,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_processing_logs").insert({
      user_id: userId,
      message_text: text,
      model: "gpt-4o-mini",
      confidence: result.confidence,
      extracted_json: result as unknown as never,
      latency_ms: latencyMs,
    });
  } catch (err) {
    console.error("[capture] falha ao logar ai_processing_logs", err);
  }
}

export async function logAudit(userId: string, action: string, metadata: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action,
      entity: "ai",
      metadata: metadata as never,
    });
  } catch (err) {
    console.error("[capture] falha ao logar audit", err);
  }
}

export { BRL };