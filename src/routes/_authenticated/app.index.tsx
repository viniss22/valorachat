import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listTransactions, CATEGORY_COLORS, type TransactionRow } from "@/lib/transactions";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MessageCircle } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard — FinanceChat" }] }),
  component: Dashboard,
});

type PeriodKey = "mes" | "3m" | "6m" | "ano" | "custom";

function periodRange(key: PeriodKey, customFrom: string, customTo: string): [string, string] {
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const end = toISO(today);
  if (key === "mes") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return [toISO(s), end];
  }
  if (key === "3m") {
    const s = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return [toISO(s), end];
  }
  if (key === "6m") {
    const s = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return [toISO(s), end];
  }
  if (key === "ano") {
    const s = new Date(today.getFullYear(), 0, 1);
    return [toISO(s), end];
  }
  return [customFrom || end, customTo || end];
}

function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function Dashboard() {
  const [firstName, setFirstName] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user; if (!u) return;
      const full = (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "";
      setFirstName(full.split(" ")[0]);
    });
  }, []);

  const { data: txs = [] } = useQuery({ queryKey: ["transactions"], queryFn: listTransactions });
  const [from, to] = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const filtered = useMemo(
    () => txs.filter((t) => t.transaction_date >= from && t.transaction_date <= to),
    [txs, from, to],
  );

  const receitas = filtered.filter((t) => t.kind === "receita").reduce((s, t) => s + t.amount_cents, 0) / 100;
  const despesas = filtered.filter((t) => t.kind === "despesa").reduce((s, t) => s + t.amount_cents, 0) / 100;
  const saldoPeriodo = receitas - despesas;
  const economia = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;

  // Evolução mensal a partir das transações filtradas
  const evolucao = useMemo(() => buildEvolution(filtered, from, to), [filtered, from, to]);
  // Categorias do período (apenas despesas)
  const categorias = useMemo(() => buildCategories(filtered), [filtered]);
  const totalCategorias = categorias.reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Olá"}
        description="Bem-vindo de volta. Seus dados são exclusivamente seus e estão protegidos."
        actions={
          <Link to="/app/whatsapp"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
            <MessageCircle className="size-4" /> Central WhatsApp
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Período</label>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês atual</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="ano">Ano atual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {dateBR(from)} → {dateBR(to)}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receitas do Período" value={brl(receitas)} tone="success" hint={`${filtered.filter(t=>t.kind==="receita").length} entradas`} />
        <StatCard label="Despesas do Período" value={brl(despesas)} hint={`${filtered.filter(t=>t.kind==="despesa").length} saídas`} />
        <StatCard label="Saldo do Período" value={brl(saldoPeriodo)} tone={saldoPeriodo >= 0 ? "success" : "primary"} hint="Receitas − Despesas" />
        <StatCard label="Economia" value={`${economia.toFixed(1)}%`} tone="primary" hint="% da receita poupada" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Evolução Financeira" action={<span className="text-xs text-muted-foreground">{evolucao.length} meses</span>}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
                  <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.006 256)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => brl(v)} />
                  <Area type="monotone" dataKey="receitas" stroke="oklch(0.68 0.15 160)" strokeWidth={2} fill="url(#recGrad)" />
                  <Area type="monotone" dataKey="despesas" stroke="oklch(0.52 0.13 235)" strokeWidth={2} fill="url(#despGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Gastos por Categoria" action={<Link to="/app/despesas" className="text-xs font-medium text-primary">Ver detalhes</Link>}>
            {categorias.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma despesa no período selecionado.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                {categorias.map((c) => {
                  const pct = (c.valor / totalCategorias) * 100;
                  return (
                    <div key={c.nome} className="flex items-center gap-4">
                      <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{c.nome}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.cor }} />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">{brl(c.valor)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categorias} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {categorias.map((c) => (<Cell key={c.nome} fill={c.cor} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              </div>
            )}
          </Section>

          <Section title="Últimas Transações" action={<Link to="/app/despesas" className="text-xs font-medium text-primary">Ver todas</Link>}>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem movimentações no período. Toque no botão + para registrar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-full ${t.kind === "receita" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                      {t.kind === "receita" ? "+" : "−"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · {dateBR(t.transaction_date)}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${t.kind === "receita" ? "text-success" : "text-foreground"}`}>
                      {t.kind === "receita" ? "+" : "−"} {brl(t.amount_cents / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <AlertsCard filtered={filtered} categorias={categorias} economia={economia} />
          <Section title="Atalhos">
            <ul className="space-y-2 text-sm">
              <li><Link to="/app/metas" className="text-primary hover:underline">→ Gerenciar metas</Link></li>
              <li><Link to="/app/whatsapp" className="text-primary hover:underline">→ Vincular WhatsApp</Link></li>
              <li><Link to="/app/assistente" className="text-primary hover:underline">→ Falar com a IA</Link></li>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}

function buildEvolution(txs: TransactionRow[], from: string, to: string) {
  const map = new Map<string, { mes: string; receitas: number; despesas: number }>();
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { mes: monthLabel(key), receitas: 0, despesas: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const t of txs) {
    const key = t.transaction_date.slice(0, 7);
    const row = map.get(key);
    if (!row) continue;
    if (t.kind === "receita") row.receitas += t.amount_cents / 100;
    else row.despesas += t.amount_cents / 100;
  }
  return Array.from(map.values());
}

function buildCategories(txs: TransactionRow[]) {
  const m = new Map<string, number>();
  for (const t of txs) if (t.kind === "despesa") m.set(t.category, (m.get(t.category) ?? 0) + t.amount_cents);
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome, cents]) => ({ nome, valor: cents / 100, cor: CATEGORY_COLORS[nome] ?? "var(--primary)" }));
}

function AlertsCard({ filtered, categorias, economia }: { filtered: TransactionRow[]; categorias: { nome: string; valor: number }[]; economia: number }) {
  const alerts: { label: string; tone: "warn" | "ok" | "info" }[] = [];
  const top = categorias[0];
  if (top) alerts.push({ label: `Maior gasto: ${top.nome} — ${brl(top.valor)}`, tone: "info" });
  if (economia >= 20) alerts.push({ label: `Economia acima da média (${economia.toFixed(0)}%) 🎉`, tone: "ok" });
  if (economia < 0) alerts.push({ label: `Gastos superam receitas em ${Math.abs(economia).toFixed(0)}%`, tone: "warn" });
  const recentes = filtered.filter((t) => t.kind === "despesa").slice(0, 3);
  if (recentes.length === 0 && filtered.length === 0) alerts.push({ label: "Nenhuma movimentação no período. Registre a primeira no botão +.", tone: "info" });

  return (
    <Section title="Alertas inteligentes">
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tudo sob controle por aqui ✨</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {alerts.map((a, i) => (
            <li key={i} className={`rounded-lg px-3 py-2 text-xs ${
              a.tone === "warn" ? "bg-destructive/10 text-destructive" :
              a.tone === "ok" ? "bg-success/10 text-success" :
              "bg-accent text-foreground"
            }`}>{a.label}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}