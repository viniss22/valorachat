import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { evolucaoInvestimentos, investimentos } from "@/lib/mock-data";
import { brl, pct } from "@/lib/format";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/app/investimentos")({
  head: () => ({ meta: [{ title: "Investimentos — FinanceChat" }] }),
  component: InvestimentosPage,
});

const TIPO_CORES: Record<string, string> = {
  "Tesouro Direto": "#0369a1",
  CDB: "#0ea5e9",
  ETF: "#38bdf8",
  Ações: "#7dd3fc",
  FII: "#22c55e",
  Cripto: "#f59e0b",
  LCI: "#a855f7",
};

function InvestimentosPage() {
  const total = investimentos.reduce((s, i) => s + i.valor, 0);
  const rentMedia =
    investimentos.reduce((s, i) => s + i.rentabilidade * i.valor, 0) / total;

  const porTipo = Object.entries(
    investimentos.reduce<Record<string, number>>((acc, i) => {
      acc[i.tipo] = (acc[i.tipo] || 0) + i.valor;
      return acc;
    }, {}),
  ).map(([nome, valor]) => ({ nome, valor, cor: TIPO_CORES[nome] || "#64748b" }));

  return (
    <>
      <PageHeader
        title="Carteira de Investimentos"
        description="Acompanhe a evolução do seu patrimônio investido por classe de ativo."
        actions={
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" /> Novo Aporte
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Patrimônio Investido" value={brl(total)} tone="primary" />
        <StatCard
          label="Rentabilidade Média"
          value={pct(rentMedia)}
          tone="success"
          hint="Ponderada pelo valor de cada ativo"
        />
        <StatCard
          label="Classes de Ativo"
          value={porTipo.length.toString()}
          hint="Carteira diversificada"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Evolução do Patrimônio" className="lg:col-span-2">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoInvestimentos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.13 235)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.52 0.13 235)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 256)" vertical={false} />
                <XAxis dataKey="mes" stroke="oklch(0.5 0.015 256)" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="oklch(0.5 0.015 256)" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.006 256)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="valor" stroke="oklch(0.52 0.13 235)" strokeWidth={2} fill="url(#invGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Alocação por Classe">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porTipo} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {porTipo.map((p) => <Cell key={p.nome} fill={p.cor} />)}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-2">
            {porTipo.map((p) => (
              <li key={p.nome} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: p.cor }} />
                  {p.nome}
                </span>
                <span className="font-semibold tabular-nums">{brl(p.valor)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Ativos da Carteira" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 font-medium">Ativo</th>
                <th className="py-2 font-medium">Classe</th>
                <th className="py-2 text-right font-medium">Valor</th>
                <th className="py-2 text-right font-medium">Rentab. 12m</th>
                <th className="py-2 text-right font-medium">% Carteira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {investimentos.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 font-medium">{i.ativo}</td>
                  <td className="py-3 text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{i.tipo}</span>
                  </td>
                  <td className="py-3 text-right tabular-nums">{brl(i.valor)}</td>
                  <td className={`py-3 text-right tabular-nums font-medium ${i.rentabilidade >= 0 ? "text-success" : "text-destructive"}`}>
                    <span className="inline-flex items-center gap-1">
                      {i.rentabilidade >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {pct(i.rentabilidade)}
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">
                    {pct((i.valor / total) * 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}