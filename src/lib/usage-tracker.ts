/**
 * Métricas de uso por usuário/mês (server-only).
 * Incremento não-atômico (read+upsert). Aceitável para telemetria.
 */

export type UsageField =
  | "whatsapp_messages_in"
  | "whatsapp_messages_out"
  | "ai_parse_calls"
  | "api_errors"
  | "transactions_count";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function incrementUsage(
  userId: string,
  field: UsageField,
  by = 1,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const metric_month = currentMonth();

    const { data: existing } = await supabaseAdmin
      .from("usage_metrics")
      .select("id, whatsapp_messages_in, whatsapp_messages_out, ai_parse_calls, api_errors, transactions_count")
      .eq("user_id", userId)
      .eq("metric_month", metric_month)
      .maybeSingle();

    if (existing) {
      const patch = { [field]: (existing[field] ?? 0) + by } as never;
      await supabaseAdmin
        .from("usage_metrics")
        .update(patch)
        .eq("id", existing.id);
    } else {
      const row = {
        user_id: userId,
        metric_month,
        [field]: by,
      } as never;
      await supabaseAdmin.from("usage_metrics").insert(row);
    }
  } catch (err) {
    console.error("[usage-tracker] falha ao incrementar", field, err);
  }
}