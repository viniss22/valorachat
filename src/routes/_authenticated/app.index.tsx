import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Plus, MessageCircle, ArrowUpRight } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import {
  categoriasGasto,
  conversasWhatsapp,
  evolucaoMensal,
  lembretes,
  metas,
  overview,
  transacoesRecentes,
  userProfile,
} from "@/lib/mock-data";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard — FinanceChat" }] }),
  component: Dashboard,
});

function Dashboard() {
  const totalGastos = categoriasGasto.reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${userProfile.name.split(" ")[0]}`}
        description="Bem-vindo de volta. Seus dados foram atualizados com base nas últimas conversas do WhatsApp."
        actions={
          <>
            <Link
              to="/app/whatsapp"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <MessageCircle className="size-4" /> Central WhatsApp
            </Link>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary hover:bg-primary/90 active:scale-[0.98]">
              <Plus className="size-4" /> Novo Registro
            </button>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo em Conta"
          value={brl(overview.saldo)}
          hint={`↑ ${overview.saldoDelta}% vs. mês anterior`}
        />
        <StatCard
          label="Receitas do Mês"
          value={brl(overview.receitas)}
          tone="success"
          hint={`Previsão: ${brl(overview.receitasPrevisao)}`}
        />
        <StatCard label="Despesas do Mês" value={brl(overview.despesas)}>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-destructive"
              style={{ width: `${(overview.despesas / overview.despesasLimite) * 100}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          label="Patrimônio Total"
          value={brl(overview.patrimonio)}
          hint={`${brl(overview.investimentos)} em investimentos`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Evolução Financeira"
            action={
              <span className="text-xs font-medium text-muted-foreground">Últimos 6 meses</span>
            }
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.15 160)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.68 0.15 160)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="despGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.52 0.13 235)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.52 0.13 235)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 256)" vertical={false} />
                  <XAxis dataKey="mes" stroke="oklch(0.5 0.015 256)" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="oklch(0.5 0.015 256)" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid oklch(0.92 0.006 256)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Area type="monotone" dataKey="receitas" stroke="oklch(0.68 0.15 160)" strokeWidth={2} fill="url(#recGrad)" />
                  <Area type="monotone" dataKey="despesas" stroke="oklch(0.52 0.13 235)" strokeWidth={2} fill="url(#despGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section
            title="Gastos por Categoria"
            action={
              <Link to="/app/despesas" className="text-xs font-medium text-primary">
                Ver detalhes
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                {categoriasGasto.map((c) => {
                  const pct = (c.valor / totalGastos) * 100;
                  return (
                    <div key={c.nome} className="flex items-center gap-4">
                      <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                        {c.nome}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: c.cor }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
                        {brl(c.valor)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoriasGasto}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {categoriasGasto.map((c) => (
                        <Cell key={c.nome} fill={c.cor} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>

          <Section
            title="Últimas Transações"
            action={
              <Link to="/app/despesas" className="text-xs font-medium text-primary">
                Ver todas
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {transacoesRecentes.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      t.tipo === "receita" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "−"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.categoria} · {dateBR(t.data)}
                      {t.origem === "whatsapp" && " · via WhatsApp"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      t.tipo === "receita" ? "text-success" : "text-foreground"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "−"} {brl(t.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Metas Financeiras" action={<Link to="/app/metas" className="text-xs font-medium text-primary">Gerenciar</Link>}>
            <div className="space-y-5">
              {metas.slice(0, 3).map((m) => {
                const pct = Math.round((m.acumulado / m.alvo) * 100);
                return (
                  <div key={m.id} className="space-y-2">
                    <div className="flex items-end justify-between">
                      <span className="text-sm font-medium">{m.titulo}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: m.cor }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {brl(m.acumulado)} de {brl(m.alvo)} — meta {m.prazo}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-success" />
                <h2 className="text-sm font-semibold">Central WhatsApp</h2>
              </div>
              <span className="text-[10px] font-medium uppercase text-muted-foreground">Online</span>
            </div>
            <div className="space-y-4 bg-muted/40 p-4">
              {conversasWhatsapp.slice(0, 2).map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-card p-3 shadow-sm ring-1 ring-black/5">
                    <p className="text-sm">{c.usuario}</p>
                    <span className="mt-1 block text-[10px] text-muted-foreground">{c.hora}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      IA
                    </div>
                    <div className="rounded-2xl rounded-tr-none border border-primary/15 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-primary">{c.resposta}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/app/whatsapp"
              className="flex items-center justify-center gap-1 border-t border-border bg-card p-3 text-xs font-semibold text-primary hover:bg-muted"
            >
              Abrir conversa completa <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <Section title="Próximos Vencimentos">
            <ul className="space-y-3">
              {lembretes.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.titulo}</p>
                    <p className="text-xs text-muted-foreground">Vence em {l.vencimento}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{brl(l.valor)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}