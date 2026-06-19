import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade — FinanceChat" }] }),
  component: () => (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="mx-auto max-w-3xl prose prose-slate">
        <Link to="/" className="text-sm text-primary">← Voltar</Link>
        <h1>Política de Privacidade</h1>
        <p>Esta página descreve como o FinanceChat trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>
        <h2>1. Dados coletados</h2>
        <p>Coletamos apenas o necessário: e-mail, nome, número de WhatsApp (opcional) e as movimentações financeiras que você registra.</p>
        <h2>2. Finalidade</h2>
        <p>Os dados são usados exclusivamente para prestar o serviço de organização financeira. Não vendemos nem compartilhamos seus dados financeiros com terceiros.</p>
        <h2>3. Bases legais</h2>
        <p>Consentimento e execução de contrato (art. 7º, I e V da LGPD).</p>
        <h2>4. Segurança</h2>
        <p>Criptografia em trânsito (TLS), isolamento de dados por usuário (RLS), trilha de auditoria e princípio do menor privilégio.</p>
        <h2>5. Seus direitos</h2>
        <p>Você pode solicitar a qualquer momento exportação ou exclusão dos seus dados em Configurações → Privacidade.</p>
        <h2>6. Contato do Encarregado (DPO)</h2>
        <p>dpo@financechat.app</p>
      </div>
    </div>
  ),
});