/**
 * Rate limiting das chamadas de IA.
 *
 * Motivação: todo endpoint que chama a OpenAI gera custo real. Sem limite,
 * uma conta pode disparar milhares de requisições e queimar o saldo da API.
 *
 * Duas barreiras:
 *  1. Por usuário/dia  — evita abuso individual.
 *  2. Global/dia       — "kill switch" de custo; protege contra criação de
 *                        muitas contas para burlar o limite individual.
 *
 * A contagem usa `ai_processing_logs`, que já registra uma linha por chamada.
 * Não exige tabela nova nem Redis.
 */

/** Chamadas de IA por usuário, por dia. */
const DAILY_LIMIT_PER_USER = 60;

/** Teto global diário (todas as contas somadas). Ajuste conforme o caixa. */
const DAILY_LIMIT_GLOBAL = 1500;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Mensagem pronta para exibir ao usuário quando bloqueado. */
  hint?: string;
}

/** Início do dia corrente no fuso de São Paulo (UTC-3), em ISO. */
function inicioDoDiaBRT(): string {
  const agora = new Date();
  const brt = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const inicioBrt = new Date(
    Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(), 0, 0, 0),
  );
  // Converte de volta para UTC somando as 3 horas.
  return new Date(inicioBrt.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

/**
 * Verifica se o usuário pode fazer mais uma chamada de IA.
 * Em caso de falha na verificação, PERMITE a chamada (fail-open) para não
 * derrubar o produto por indisponibilidade do banco — o teto global continua
 * sendo a rede de segurança.
 */
export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const desde = inicioDoDiaBRT();

    const [porUsuario, global] = await Promise.all([
      supabaseAdmin
        .from("ai_processing_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", desde),
      supabaseAdmin
        .from("ai_processing_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", desde),
    ]);

    const usadasUsuario = porUsuario.count ?? 0;
    const usadasGlobal = global.count ?? 0;

    if (usadasGlobal >= DAILY_LIMIT_GLOBAL) {
      return {
        allowed: false,
        remaining: 0,
        hint: "O assistente atingiu o limite de uso de hoje. Tente novamente amanhã.",
      };
    }

    if (usadasUsuario >= DAILY_LIMIT_PER_USER) {
      return {
        allowed: false,
        remaining: 0,
        hint: `Você atingiu o limite de ${DAILY_LIMIT_PER_USER} interações com a IA hoje. O limite renova amanhã — você pode continuar lançando manualmente.`,
      };
    }

    return { allowed: true, remaining: DAILY_LIMIT_PER_USER - usadasUsuario };
  } catch (err) {
    console.error("[rate-limit] falha ao verificar limite", err);
    return { allowed: true, remaining: DAILY_LIMIT_PER_USER };
  }
}

/**
 * Telemetria mensal de uso (base para planos e cobrança futura).
 * Nunca lança: falha de métrica não pode quebrar a requisição do usuário.
 */
export async function incrementUsage(
  userId: string,
  field:
    | "transactions_count"
    | "ai_parse_calls"
    | "api_errors",
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const mes = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const { data: atual } = await supabaseAdmin
      .from("usage_metrics")
      .select("id, transactions_count, ai_parse_calls, api_errors")
      .eq("user_id", userId)
      .eq("metric_month", mes)
      .maybeSingle();

    if (atual) {
      const atuais = atual as unknown as Record<string, number | null>;
      const proximo = (atuais[field] ?? 0) + 1;
      const patch =
        field === "transactions_count"
          ? { transactions_count: proximo }
          : field === "ai_parse_calls"
            ? { ai_parse_calls: proximo }
            : { api_errors: proximo };

      await supabaseAdmin.from("usage_metrics").update(patch).eq("id", atual.id);
    } else {
      // Insere a linha do mês com todos os contadores zerados e apenas o
      // campo alvo em 1 — evita ambiguidade de tipos no insert.
      await supabaseAdmin.from("usage_metrics").insert({
        user_id: userId,
        metric_month: mes,
        transactions_count: field === "transactions_count" ? 1 : 0,
        ai_parse_calls: field === "ai_parse_calls" ? 1 : 0,
        api_errors: field === "api_errors" ? 1 : 0,
      });
    }
  } catch (err) {
    console.error("[usage] falha ao incrementar métrica", err);
  }
}
