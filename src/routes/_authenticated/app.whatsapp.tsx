/**
 * Central WhatsApp — DESATIVADA.
 *
 * O canal está dormente: a Meta passará a cobrar por mensagem enviada pela
 * API, o que inviabiliza a margem dos planos atuais. A captura conversacional
 * foi movida para dentro do app (Assistente IA).
 *
 * Esta rota redireciona para o Assistente para não confundir quem tiver o
 * link antigo salvo. O backend do canal continua íntegro:
 *   - src/routes/api/whatsapp/webhook.ts
 *   - src/lib/whatsapp-sender.ts
 *   - src/lib/finance-processor.ts
 *   - tabelas whatsapp_messages e whatsapp_verifications
 *
 * Para reativar: restaure a interface anterior por cima deste arquivo e
 * descomente o item correspondente em src/components/app-sidebar.tsx.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  beforeLoad: () => {
    throw redirect({ to: "/app/assistente" });
  },
});
