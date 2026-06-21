/**
 * Envio de mensagens via WhatsApp Cloud API (Meta).
 * Server-only: usa WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID.
 */

const MAX_LEN = 1024;
const GRAPH_VERSION = "v21.0";

export interface SendResult {
  messageId: string;
}

function normalizePhone(phone: string): string {
  // Meta espera E.164 sem o '+'
  return phone.replace(/[^\d]/g, "");
}

/**
 * Envia uma mensagem de texto para o número informado.
 * Lança Error se a chamada falhar — quem chama deve tratar para não quebrar
 * o fluxo principal (criação de transação etc).
 */
export async function sendWhatsappMessage(
  phoneNumber: string,
  message: string,
): Promise<SendResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) throw new Error("WHATSAPP_API_TOKEN não configurada");
  if (!phoneId) throw new Error("WHATSAPP_PHONE_NUMBER_ID não configurada");

  const to = normalizePhone(phoneNumber);
  const body = message.length > MAX_LEN ? message.slice(0, MAX_LEN - 1) + "…" : message;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`WhatsApp API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = (await res.json().catch(() => null)) as
    | { messages?: Array<{ id: string }> }
    | null;
  const messageId = json?.messages?.[0]?.id;
  if (!messageId) throw new Error("Resposta da Meta sem messageId");

  return { messageId };
}