import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, TrendingUp } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { evolucaoMensal, categoriasGasto } from "@/lib/mock-data";
import { brl, pct } from "@/lib/format";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — FinanceChat" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const totalReceitas = evolucaoMensal.reduce((s, m) => s + m.receitas, 0);
  const totalDespesas = evolucaoMensal.reduce((s, m) => s + m.despesas, 0);
  const economia = totalReceitas - totalDespesas;
  const taxaPoupanca = (economia / totalReceitas) * 100;

  return (
    <>
      <PageHeader
        title="Relatórios Financeiros"
        description="Análises detalhadas do seu desempenho financeiro semestral."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
              <FileText className="size-4" /> PDF
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Download className="size-4" /> Exportar
            </button>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Receitas (6m)" value={brl(totalReceitas)} tone="success" />
        <StatCard label="Despesas (6m)" value={brl(totalDespesas)} tone="danger" />
        <StatCard label="Economia Líquida" value={brl(economia)} tone="primary" />
        <StatCard
          label="Taxa de Poupança"
          value={pct(taxaPoupanca, 1)}
          tone="success"
          hint="Acima da média nacional (8%)"
        />
      </div>

      <Section title="Receitas vs. Despesas — Últimos 6 Meses" className="mb-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 256)" vertical={false} />
              <XAxis dataKey="mes" stroke="oklch(0.5 0.015 256)" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="oklch(0.5 0.015 256)" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.006 256)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receitas" name="Receitas" fill="oklch(0.68 0.15 160)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="oklch(0.52 0.13 235)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Insights da IA">
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <p className="font-medium">Você aumentou sua taxa de poupança em 6 meses</p>
                <p className="text-xs text-muted-foreground">Sua economia passou de R$ 3.100 (Jan) para R$ 5.080 (Jun). Continue assim!</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
                !
              </div>
              <div>
                <p className="font-medium">Gastos com Assinaturas merecem revisão</p>
                <p className="text-xs text-muted-foreground">R$ 218/mês equivalem a R$ 2.616/ano. Avalie cancelar serviços não usados.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-primary">
                ✓
              </div>
              <div>
                <p className="font-medium">Reserva de Emergência a 85%</p>
                <p className="text-xs text-muted-foreground">Faltam R$ 3.000 para atingir a meta. Mantendo o ritmo, conclui em 2 meses.</p>
              </div>
            </li>
          </ul>
        </Section>

        <Section title="Composição de Despesas">
          <ul className="space-y-3">
            {categoriasGasto.map((c) => {
              const total = categoriasGasto.reduce((s, x) => s + x.valor, 0);
              const p = (c.valor / total) * 100;
              return (
                <li key={c.nome} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{c.nome}</span>
                    <span className="font-semibold tabular-nums">{brl(c.valor)} · {p.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: c.cor }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </>
  );
}