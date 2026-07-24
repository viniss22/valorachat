import { createFileRoute } from "@tanstack/react-router";

/**
 * Histórico do Assistente IA.
 *   GET    → devolve as últimas mensagens da conversa
 *   DELETE → apaga a conversa inteira do usuário
 */
export const Route = createFileRoute("/api/chat/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveUserId } = await import("@/lib/capture.server");
        const { loadHistory } = await import("@/lib/chat-history.server");

        const userId = await resolveUserId(request.headers.get("authorization"));
        if (!userId) {
          return Response.json({ messages: [] }, { status: 401 });
        }

        const messages = await loadHistory(userId);
        return Response.json({ messages });
      },

      DELETE: async ({ request }) => {
        const { resolveUserId } = await import("@/lib/capture.server");
        const { clearHistory } = await import("@/lib/chat-history.server");

        const userId = await resolveUserId(request.headers.get("authorization"));
        if (!userId) {
          return Response.json({ ok: false }, { status: 401 });
        }

        const ok = await clearHistory(userId);
        return Response.json({ ok });
      },
    },
  },
});
