import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseFinanceMessage } from "@/lib/ai-gateway.server";
import { processWhatsappMessage } from "@/lib/finance-processor";
import { sendWhatsappMessage } from "@/lib/whatsapp-sender";

/**
 * Webhook do WhatsApp Cloud API (Meta).
 * - GET: validação inicial (hub.challenge).
 * - POST: assinatura HMAC, parse com IA e delega para o finance-processor.
 * Sempre 200 OK no POST para evitar reentrega.
 */

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
      value?: { messages?: WhatsAppIncomingMessage[] };
    }>;
  }>;
}

function verifySignature(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

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

      POST: async ({ request }) => {
        const rawBody = await request.text();
        const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
        const sigHeader = request.headers.get("x-hub-signature-256");

        if (!secret) {
          console.error("[whatsapp] WHATSAPP_WEBHOOK_SECRET ausente");
          return new Response("ok", { status: 200 });
        }
        if (!verifySignature(rawBody, sigHeader, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

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

        const from = message.from;
        const text = message.text.body;
        const waMsgId = message.id;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Resolve user_id pelo telefone.
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

        // Registra inbound (sempre).
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

        if (!userId) return new Response("ok", { status: 200 });

        // Parse + processamento.
        try {
          const parsed = await parseFinanceMessage(text);
          await processWhatsappMessage(userId, from, parsed, waMsgId);
        } catch (err) {
          const errMsg =
            err instanceof Error
              ? err.message
              : "Não entendi. Tente: 'gastei 50 em almoço'";
          try {
            await sendWhatsappMessage(from, `❌ ${errMsg}`);
          } catch (sendErr) {
            console.error("[whatsapp] erro ao responder erro", sendErr);
          }
          await supabaseAdmin
            .from("whatsapp_messages")
            .update({ parsing_status: "failed", parsing_error: errMsg })
            .eq("whatsapp_message_id", waMsgId);

          await supabaseAdmin.from("audit_logs").insert({
            user_id: userId,
            action: "whatsapp.parse_failed",
            entity: "whatsapp_message",
            metadata: { phone: from, error: errMsg, text },
          });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});