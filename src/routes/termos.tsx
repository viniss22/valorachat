import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de Uso — Valora" }] }),
  component: () => (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="mx-auto max-w-3xl prose prose-slate">
        <Link to="/" className="text-sm text-primary">← Voltar</Link>
        <h1>Termos de Uso</h1>
        <p>Ao usar o Valora você concorda com as regras abaixo.</p>
        <h2>1. Conta</h2><p>Você é responsável pela confidencialidade da sua senha.</p>
        <h2>2. Uso permitido</h2><p>Uso pessoal, lícito e não automatizado.</p>
        <h2>3. Limitação</h2><p>O serviço é fornecido "como está", sem garantias de disponibilidade contínua.</p>
        <h2>4. Cancelamento</h2><p>Você pode encerrar a conta a qualquer momento, com exclusão definitiva dos dados.</p>
      </div>
    </div>
  ),
});