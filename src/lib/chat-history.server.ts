/**
 * Histórico do Assistente IA.
 *
 * A conversa é persistida no BACKEND (não no navegador) por dois motivos:
 *  1. Evita perder mensagens se a aba fechar no meio de uma resposta.
 *  2. Permite enviar as últimas trocas como contexto para a IA, sem confiar
 *     em algo que o cliente possa manipular.
 *
 * Nenhuma função aqui lança exceção: falha ao gravar histórico nunca pode
 * quebrar o registro de uma transação ou a resposta do assistente.
 */

/** Quantas mensagens a tela carrega ao abrir. */
export const HISTORY_PAGE_SIZE = 50;

/** Quantas trocas recentes vão como contexto para a IA (controla custo). */
export const CONTEXT_WINDOW = 10;

export type ChatRole = "user" | "assistant";
export type ChatKind = "text" | "capture";

export interface ChatMessageRow {
  id: string;
  role: ChatRole;
  content: string;
  kind: ChatKind;
  capture_status: string | null;
  transaction_id: string | null;
  created_at: string;
}

interface SaveInput {
  userId: string;
  role: ChatRole;
  content: string;
  kind?: ChatKind;
  captureStatus?: string | null;
  transactionId?: string | null;
}

/** Grava uma mensagem. Silencioso em caso de erro. */
export async function saveMessage(input: SaveInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("chat_messages").insert({
      user_id: input.userId,
      role: input.role,
      content: input.content.slice(0, 4000),
      kind: input.kind ?? "text",
      capture_status: input.captureStatus ?? null,
      transaction_id: input.transactionId ?? null,
    });
  } catch (err) {
    console.error("[chat-history] falha ao salvar mensagem", err);
  }
}

/**
 * Carrega as mensagens mais recentes, já em ordem cronológica
 * (mais antiga primeiro), pronta para renderizar.
 */
export async function loadHistory(
  userId: string,
  limit = HISTORY_PAGE_SIZE,
): Promise<ChatMessageRow[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, kind, capture_status, transaction_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as ChatMessageRow[]).reverse();
  } catch (err) {
    console.error("[chat-history] falha ao carregar histórico", err);
    return [];
  }
}

/**
 * Últimas trocas em formato de mensagens para a IA.
 * Só entra conversa de texto: cartões de captura não ajudam a responder
 * perguntas analíticas e gastariam tokens à toa.
 */
export async function loadContext(
  userId: string,
): Promise<Array<{ role: ChatRole; content: string }>> {
  const rows = await loadHistory(userId, CONTEXT_WINDOW * 2);
  return rows
    .filter((r) => r.kind === "text")
    .slice(-CONTEXT_WINDOW)
    .map((r) => ({ role: r.role, content: r.content }));
}

/** Apaga toda a conversa do usuário. */
export async function clearHistory(userId: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);
    return !error;
  } catch (err) {
    console.error("[chat-history] falha ao limpar histórico", err);
    return false;
  }
}
