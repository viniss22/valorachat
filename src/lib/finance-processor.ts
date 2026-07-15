import type { ParseResult } from "./ai-gateway.server";
import { sendWhatsappMessage } from "./whatsapp-sender";

/**
 * Converte uma `ParseResult` em uma transação real no banco e responde no
 * WhatsApp. Server-only: usa o admin client para escrever em nome do usuário
 * já identificado pelo webhook (RLS bypass intencional, autorização feita
 * via lookup do `whatsapp_number` -> `user_id`).
 */

export interface ProcessResult {
  success: boolean;
  transactionId?: string;
  message: string;
  requiresConfirmation: boolean;
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const EXPENSE_CATEGORIES = new Set([
  "Alimentação",
  "Moradia",
  "Transporte",
  "Lazer",
  "Saúde",
  "Educação",
  "Assinaturas",
  "Compras",
  "Outros",
]);
const INCOME_CATEGORIES = new Set([
  "Salário",
  "Honorários",
  "Dividendos",
  "Aluguéis",
  "Vendas",
  "Outros",
]);

/** Compatibiliza categoria do parser com as aceitas em `transactions`. */
function normalizeCategory(
  type: "receita" | "despesa",
  category: string,
): string {
  const allowed = type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (allowed.has(category)) return category;
  if (category === "Outro") return "Outros";
  return "Outros";
}

/** Tenta enviar resposta no WhatsApp; loga falhas mas não propaga. */
async function safeReply(
  phone: string,
  text: string,
): Promise<string | null> {
  try {
    const { messageId } = await sendWhatsappMessage(phone, text);
    return messageId;
  } catch (err) {
    console.error("[finance-processor] falha ao enviar WhatsApp", err);
    return null;
  }
}

export async function processWhatsappMessage(
  userId: string,
  phoneE164: string,
  parseResult: ParseResult,
  inboundMessageId?: string,
): Promise<ProcessResult> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const today = new Date().toISOString().slice(0, 10);
  const valor = BRL.format(parseResult.amount);
  const sinal = parseResult.type === "despesa" ? "-" : "+";

  // ------- Confidence baixíssima: rejeita -------
  if (parseResult.confidence <= 0.5) {
    const message = `❌ Não consegui entender. Tente: "Gastei 50 em almoço"`;
    const outboundId = await safeReply(phoneE164, message);

    if (inboundMessageId) {
      await supabaseAdmin
        .from("whatsapp_messages")
        .update({ parsing_status: "failed", parsing_error: "low_confidence" })
        .eq("whatsapp_message_id", inboundMessageId);
    }
    await supabaseAdmin.from("whatsapp_messages").insert({
      user_id: userId,
      phone_e164: phoneE164,
      direction: "outbound",
      message_text: message,
      whatsapp_message_id: outboundId,
      parsing_status: "failed",
      parsing_error: "low_confidence",
    });

    return { success: false, message, requiresConfirmation: false };
  }

  // ------- Confidence média: pede confirmação -------
  if (parseResult.confidence < 0.8) {
    const category = normalizeCategory(parseResult.type, parseResult.category);
    const message =
      `⏳ Entendi: ${valor} em ${category} (${parseResult.description}).\n` +
      `Responda *Confirmar* para registrar ou *Cancelar* para descartar.`;
    const outboundId = await safeReply(phoneE164, message);

    if (inboundMessageId) {
      await supabaseAdmin
        .from("whatsapp_messages")
        .update({ parsing_status: "pending_confirmation" })
        .eq("whatsapp_message_id", inboundMessageId);
    }
    await supabaseAdmin.from("whatsapp_messages").insert({
      user_id: userId,
      phone_e164: phoneE164,
      direction: "outbound",
      message_text: message,
      whatsapp_message_id: outboundId,
      parsing_status: "pending_confirmation",
      parsed_json: parseResult as unknown as never,
    });

    return { success: false, message, requiresConfirmation: true };
  }

  // ------- Confidence alta: cria transação -------
  try {
    const category = normalizeCategory(parseResult.type, parseResult.category);
    const amountCents = Math.round(parseResult.amount * 100);

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        kind: parseResult.type,
        amount_cents: amountCents,
        category,
        description: parseResult.description || category,
        transaction_date: today,
        payment_method: "outro",
        installments_total: 1,
        installment_number: 1,
        source: "whatsapp",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      throw insertErr ?? new Error("Falha ao inserir transação");
    }

    const transactionId = inserted.id as string;
    const message = `✅ Registrado: ${sinal}${valor} em ${category} (${parseResult.description})`;
    const outboundId = await safeReply(phoneE164, message);

    if (inboundMessageId) {
      await supabaseAdmin
        .from("whatsapp_messages")
        .update({
          parsing_status: "success",
          transaction_id: transactionId,
        })
        .eq("whatsapp_message_id", inboundMessageId);
    }
    await supabaseAdmin.from("whatsapp_messages").insert({
      user_id: userId,
      phone_e164: phoneE164,
      direction: "outbound",
      message_text: message,
      whatsapp_message_id: outboundId,
      transaction_id: transactionId,
      parsing_status: "success",
    });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "transaction.create",
      entity: "transaction",
      entity_id: transactionId,
      metadata: {
        source: "whatsapp",
        phone: phoneE164,
        amount_cents: amountCents,
        category,
        kind: parseResult.type,
        confidence: parseResult.confidence,
      },
    });

    return {
      success: true,
      transactionId,
      message,
      requiresConfirmation: false,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Erro no banco de dados";
    const message = `❌ Não consegui registrar: ${errMsg}`;
    const outboundId = await safeReply(phoneE164, message);

    if (inboundMessageId) {
      await supabaseAdmin
        .from("whatsapp_messages")
        .update({ parsing_status: "failed", parsing_error: errMsg })
        .eq("whatsapp_message_id", inboundMessageId);
    }
    await supabaseAdmin.from("whatsapp_messages").insert({
      user_id: userId,
      phone_e164: phoneE164,
      direction: "outbound",
      message_text: message,
      whatsapp_message_id: outboundId,
      parsing_status: "failed",
      parsing_error: errMsg,
    });

    return { success: false, message, requiresConfirmation: false };
  }
}

/**
 * Confirma a última mensagem `pending_confirmation` do usuário e cria a
 * transação a partir do `parsed_json` salvo previamente. Se não houver nada
 * pendente, apenas responde no WhatsApp.
 */
export async function confirmPendingTransaction(
  userId: string,
  phoneE164: string,
): Promise<ProcessResult> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const { data: pending } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id, parsed_json")
    .eq("user_id", userId)
    .eq("parsing_status", "pending_confirmation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending || !pending.parsed_json) {
    const message = "Não há nada pendente para confirmar.";
    await safeReply(phoneE164, message);
    return { success: false, message, requiresConfirmation: false };
  }

  const parsed = pending.parsed_json as unknown as ParseResult;
  const forced: ParseResult = { ...parsed, confidence: 1 };

  // Marca a pendência como consumida para não confirmar duas vezes.
  await supabaseAdmin
    .from("whatsapp_messages")
    .update({ parsing_status: "confirmed" })
    .eq("id", pending.id);

  return processWhatsappMessage(userId, phoneE164, forced);
}

/**
 * Cancela a última mensagem `pending_confirmation` do usuário.
 */
export async function cancelPendingTransaction(
  userId: string,
  phoneE164: string,
): Promise<ProcessResult> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const { data: pending } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("parsing_status", "pending_confirmation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    const message = "Não há nada pendente para cancelar.";
    await safeReply(phoneE164, message);
    return { success: false, message, requiresConfirmation: false };
  }

  await supabaseAdmin
    .from("whatsapp_messages")
    .update({ parsing_status: "cancelled" })
    .eq("id", pending.id);

  const message = "Cancelado. Nada foi registrado.";
  const outboundId = await safeReply(phoneE164, message);
  await supabaseAdmin.from("whatsapp_messages").insert({
    user_id: userId,
    phone_e164: phoneE164,
    direction: "outbound",
    message_text: message,
    whatsapp_message_id: outboundId,
    parsing_status: "cancelled",
  });

  return { success: false, message, requiresConfirmation: false };
}

const CONFIRM_WORDS = new Set([
  "confirmar",
  "confirmo",
  "sim",
  "s",
  "ok",
  "isso",
]);
const CANCEL_WORDS = new Set(["cancelar", "cancela", "nao", "n"]);

export type ConfirmationIntent = "confirm" | "cancel" | null;

/** Detecta se o texto é uma resposta de confirmação/cancelamento. */
export function detectConfirmationIntent(text: string): ConfirmationIntent {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");
  if (!normalized) return null;
  if (CONFIRM_WORDS.has(normalized)) return "confirm";
  if (CANCEL_WORDS.has(normalized)) return "cancel";
  return null;
}