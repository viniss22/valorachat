/**
 * Rate limit diário por plano para mensagens inbound do WhatsApp.
 * Contagem baseada em `whatsapp_messages` (direction=inbound, created_at hoje).
 */

const LIMITS: Record<string, number> = {
  trial: 50,
  essencial: 30,
  premium_ia: 200,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
  message?: string;
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  let plan = "trial";
  try {
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.plan && LIMITS[data.plan] !== undefined) plan = data.plan;
  } catch (err) {
    console.error("[whatsapp-limiter] erro ao buscar plano", err);
  }

  const limit = LIMITS[plan] ?? LIMITS.trial;

  let count = 0;
  try {
    const { count: c } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .gte("created_at", startOfTodayISO());
    count = c ?? 0;
  } catch (err) {
    console.error("[whatsapp-limiter] erro ao contar mensagens", err);
    // Em caso de falha, permite (fail-open) para não bloquear o usuário.
    return { allowed: true, remaining: limit, limit, plan };
  }

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      plan,
      message: `⚠️ Limite diário de ${limit} mensagens atingido. Atualize seu plano para registrar mais.`,
    };
  }

  return { allowed: true, remaining: limit - count, limit, plan };
}