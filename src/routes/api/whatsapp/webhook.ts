import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseFinanceMessage } from "@/lib/ai-gateway.server";

/**
 * Webhook do WhatsApp Cloud API (Meta).
 * - GET: validação do webhook (hub.challenge).
 * - POST: recebe mensagens, valida assinatura HMAC-SHA256,
 *         identifica o usuário pelo telefone, faz parse com IA,
 *         registra em `whatsapp_messages` e responde ao usuário.
 *
 * Sempre retorna 200 OK no POST para evitar reentrega da Meta.
 */

// ---------- Tipos ----------

interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type?: string;
  text?: { body: string };
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppIncomingMessage[];
        metadata?: { phone_number_id?: string };
      };
    }>;
  }>;
}

// ---------- Helpers ----------

function verifySignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Envia mensagem de texto via WhatsApp Cloud API. */
async function sendWhatsAppMessage(to: string, body: string): Promise<string | null> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("[whatsapp] WHATSAPP_API_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente");
    return null;
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
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
    const json = (await res.json().catch(() => null)) as
      | { messages?: Array<{ id: string }> }
      | null;
    return json?.messages?.[0]?.id ?? null;
  } catch (err) {
    console.error("[whatsapp] erro ao enviar mensagem", err);
    return null;
  }
}

// ---------- Rota ----------

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      // Validação inicial pelo painel da Meta.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const challenge = url.searchParams.get("hub.challenge");
        const token = url.searchParams.get("hub.verify_token");
        const expected = process.env.WHATSAPP_WEBHOOK_TOKEN;

        if (mode === "subscribe" && expected && token === expected && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Recebe mensagens do WhatsApp.
      POST: async ({ request }) => {
        // 1) Validar assinatura HMAC.
        const rawBody = await request.text();
        const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
        const signatureHeader = request.headers.get("x-hub-signature-256");

        if (!secret) {
          console.error("[whatsapp] WHATSAPP_WEBHOOK_SECRET ausente");
          return new Response("ok", { status: 200 });
        }
        if (!verifySignature(rawBody, signatureHeader, secret)) {
          console.warn("[whatsapp] assinatura inválida");
          return new Response("Invalid signature", { status: 401 });
        }

        // 2) Parsear payload.
        let payload: WhatsAppWebhookPayload;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("ok", { status: 200 });
        }

        const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message || message.type !== "text" || !message.text?.body) {
          return new Response("ok", { status: 200 });
        }

        const from = message.from; // E.164 sem '+'
        const text = message.text.body;
        const waMsgId = message.id;

        // 3) Carregar admin client APENAS no servidor (server-only import).
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // 4) Identificar usuário pelo número.
        let userId: string | null = null;
        try {
          const variants = Array.from(
            new Set([from, `+${from}`, from.replace(/^\+/, "")]),
          );
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .in("whatsapp_number", variants)
            .maybeSingle();
          userId = profile?.id ?? null;
        } catch (err) {
          console.error("[whatsapp] erro ao buscar profile", err);
        }

        // 5) Registrar inbound (sempre, mesmo sem usuário).
        try {
          await supabaseAdmin.from("whatsapp_messages").insert({
            user_id: userId,
            phone_e164: from,
            direction: "inbound",
            message_text: text,
            whatsapp_message_id: waMsgId,
            parsing_status: "pending",
          });
        } catch (err) {
          console.error("[whatsapp] erro ao gravar inbound", err);
        }

        if (!userId) {
          return new Response("ok", { status: 200 });
        }

        // 6) Tentar parse com IA.
        try {
          const parsed = await parseFinanceMessage(text);

          // Confirmação ao usuário (registro real de transação fica para próximo prompt).
          const reply =
            `✅ ${parsed.type === "receita" ? "Receita" : "Despesa"} registrada\n` +
            `Valor: R$ ${parsed.amount.toFixed(2).replace(".", ",")}\n` +
            `Categoria: ${parsed.category}\n` +
            `Descrição: ${parsed.description}`;

          const outboundId = await sendWhatsAppMessage(from, reply);

          await supabaseAdmin
            .from("whatsapp_messages")
            .update({ parsing_status: "success" })
            .eq("whatsapp_message_id", waMsgId);

          await supabaseAdmin.from("whatsapp_messages").insert({
            user_id: userId,
            phone_e164: from,
            direction: "outbound",
            message_text: reply,
            whatsapp_message_id: outboundId,
            parsing_status: "success",
          });

          await supabaseAdmin.from("audit_logs").insert({
            user_id: userId,
            action: "whatsapp_message_parsed",
            metadata: {
              phone: from,
              amount: parsed.amount,
              category: parsed.category,
              type: parsed.type,
              confidence: parsed.confidence,
            },
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Erro ao processar";
          const reply = `❌ ${errorMsg}\nExemplo: "gastei 50 em almoço"`;
          const outboundId = await sendWhatsAppMessage(from, reply);

          await supabaseAdmin
            .from("whatsapp_messages")
            .update({ parsing_status: "failed", parsing_error: errorMsg })
            .eq("whatsapp_message_id", waMsgId);

          await supabaseAdmin.from("whatsapp_messages").insert({
            user_id: userId,
            phone_e164: from,
            direction: "outbound",
            message_text: reply,
            whatsapp_message_id: outboundId,
            parsing_status: "failed",
            parsing_error: errorMsg,
          });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});