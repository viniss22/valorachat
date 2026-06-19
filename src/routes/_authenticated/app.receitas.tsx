import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { transacoesRecentes, overview } from "@/lib/mock-data";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/receitas")({
  head: () => ({ meta: [{ title: "Receitas — FinanceChat" }] }),
  component: ReceitasPage,
});

const fontes = [
  { nome: "Salário", valor: 6500 },
  { nome: "Honorários", valor: 1200 },
  { nome: "Dividendos", valor: 145 },
  { nome: "Aluguéis", valor: 355 },
];

function ReceitasPage() {
  const receitas = transacoesRecentes.filter((t) => t.tipo === "receita");
  const total = fontes.reduce((s, x) => s + x.valor, 0);
  return (
    <>
      <PageHeader title="Receitas" description="Tudo o que entra na sua conta — salário, honorários, comissões, dividendos e mais."
        actions={<button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="size-4" /> Nova Receita</button>} />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Receitas do Mês" value={brl(overview.receitas)} tone="success" hint="6 fontes diferentes" />
        <StatCard label="Média 6 meses" value={brl(7791)} hint="↑ 8% vs. semestre anterior" />
        <StatCard label="Próxima Previsão" value={brl(overview.receitasPrevisao)} hint="Inclui bônus e dividendos" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Por fonte" className="lg:col-span-1">
          <div className="space-y-4">
            {fontes.map((f) => (
              <div key={f.nome}>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{f.nome}</span><span className="tabular-nums text-muted-foreground">{brl(f.valor)}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-success" style={{ width: `${(f.valor / total) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Receitas recentes" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {receitas.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">+</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.descricao}</p><p className="text-xs text-muted-foreground">{t.categoria} · {dateBR(t.data)}{t.origem === "whatsapp" && " · via WhatsApp"}</p></div>
                <span className="text-sm font-semibold tabular-nums text-success">+ {brl(t.valor)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}