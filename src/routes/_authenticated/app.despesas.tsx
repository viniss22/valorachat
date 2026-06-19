import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { categoriasGasto, transacoesRecentes, overview } from "@/lib/mock-data";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/despesas")({
  head: () => ({ meta: [{ title: "Despesas — FinanceChat" }] }),
  component: DespesasPage,
});

function DespesasPage() {
  const despesas = transacoesRecentes.filter((t) => t.tipo === "despesa");
  const total = categoriasGasto.reduce((s, c) => s + c.valor, 0);
  return (
    <>
      <PageHeader title="Despesas" description="Acompanhe para onde seu dinheiro vai. Categorias inteligentes baseadas em IA."
        actions={<button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="size-4" /> Nova Despesa</button>} />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Despesas do Mês" value={brl(overview.despesas)} hint={`Limite: ${brl(overview.despesasLimite)}`} />
        <StatCard label="Maior Categoria" value={categoriasGasto[0].nome} tone="primary" hint={brl(categoriasGasto[0].valor)} />
        <StatCard label="Disponível" value={brl(overview.despesasLimite - overview.despesas)} tone="success" hint="↓ 18% vs. mês anterior" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Por categoria" className="lg:col-span-2">
          <div className="space-y-4">{categoriasGasto.map((c) => (
            <div key={c.nome} className="flex items-center gap-4">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{c.nome}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(c.valor / total) * 100}%`, background: c.cor }} /></div>
              <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">{brl(c.valor)}</span>
            </div>))}</div>
        </Section>
        <Section title="Sugestões da IA">
          <ul className="space-y-3 text-sm">
            <li className="rounded-lg bg-success/5 p-3 ring-1 ring-success/20"><p className="font-medium text-success">−R$ 120/mês</p><p className="mt-1 text-xs text-muted-foreground">Assinaturas duplicadas detectadas.</p></li>
            <li className="rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20"><p className="font-medium text-primary">−R$ 80/mês</p><p className="mt-1 text-xs text-muted-foreground">Renegocie sua conta de internet.</p></li>
          </ul>
        </Section>
      </div>
      <Section title="Despesas recentes" className="mt-6">
        <ul className="divide-y divide-border">{despesas.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">−</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.descricao}</p><p className="text-xs text-muted-foreground">{t.categoria} · {dateBR(t.data)}{t.origem === "whatsapp" && " · via WhatsApp"}</p></div>
            <span className="text-sm font-semibold tabular-nums">− {brl(t.valor)}</span>
          </li>))}</ul>
      </Section>
    </>
  );
}