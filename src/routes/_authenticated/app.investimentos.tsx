import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, pct } from "@/lib/format";
import { Plus, TrendingUp, TrendingDown, Trash2, LineChart, Wallet, PieChart as PieIcon } from "lucide-react";
import {
  listInvestments,
  createInvestment,
  deleteInvestment,
  investmentReturnPct,
  investmentTypeLabel,
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_COLORS,
  type InvestmentInput,
  type InvestmentType,
} from "@/lib/investments";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/investimentos")({
  head: () => ({ meta: [{ title: "Investimentos — Finora" }] }),
  component: InvestimentosPage,
});

function InvestimentosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: listInvestments,
  });

  const totalInvested = rows.reduce((s, r) => s + r.invested_cents, 0);
  const totalCurrent = rows.reduce((s, r) => s + r.current_cents, 0);
  const overallReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const byType = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + r.current_cents;
      return acc;
    }, {}),
  ).map(([type, cents]) => ({
    type,
    label: investmentTypeLabel(type),
    valor: cents / 100,
    cor: INVESTMENT_TYPE_COLORS[type as InvestmentType] ?? "var(--primary)",
  }));

  async function handleDelete(id: string) {
    if (!confirm("Excluir este investimento? A ação fica registrada na auditoria.")) return;
    try {
      await deleteInvestment(id);
      toast.success("Investimento excluído");
      qc.invalidateQueries({ queryKey: ["investments"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Carteira de Investimentos"
        description="Seu patrimônio investido, organizado por tipo de aplicação."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="size-4" /> Adicionar investimento</Button>
            </DialogTrigger>
            <NewInvestmentDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["investments"] }); }} />
          </Dialog>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Patrimônio Atual" value={brl(totalCurrent / 100)} hint={`${rows.length} ${rows.length === 1 ? "ativo" : "ativos"}`} icon={Wallet} gradient />
        <StatCard label="Total Investido" value={brl(totalInvested / 100)} icon={LineChart} tone="primary" hint="Soma dos aportes" />
        <StatCard
          label="Rentabilidade Total"
          value={`${overallReturn >= 0 ? "+" : ""}${overallReturn.toFixed(2)}%`}
          tone={overallReturn >= 0 ? "success" : "danger"}
          icon={overallReturn >= 0 ? TrendingUp : TrendingDown}
          hint={`${overallReturn >= 0 ? "Lucro" : "Prejuízo"} de ${brl((totalCurrent - totalInvested) / 100)}`}
        />
      </div>

      {rows.length === 0 && !isLoading ? (
        <Section title="Comece sua carteira">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <PieIcon className="size-8" />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-semibold">Comece a acompanhar seu patrimônio</h3>
              <p className="text-sm text-muted-foreground">
                Cadastre o que você já tem — Tesouro, CDB, ações, FIIs, ETFs ou cripto. Basta informar quanto investiu e quanto vale hoje; nós calculamos a rentabilidade.
              </p>
            </div>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="size-4" /> Adicionar primeiro ativo</Button>
          </div>
        </Section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Section title="Ativos da Carteira" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 font-medium">Ativo</th>
                    <th className="py-2 font-medium">Classe</th>
                    <th className="py-2 text-right font-medium">Investido</th>
                    <th className="py-2 text-right font-medium">Atual</th>
                    <th className="py-2 text-right font-medium">Rentab.</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => {
                    const ret = investmentReturnPct(r);
                    const positive = ret >= 0;
                    return (
                      <tr key={r.id} className="group">
                        <td className="py-3">
                          <div className="font-medium">{r.name}</div>
                          {r.institution && <div className="text-xs text-muted-foreground">{r.institution}</div>}
                        </td>
                        <td className="py-3">
                          <span
                            className="rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{
                              background: `color-mix(in oklab, ${INVESTMENT_TYPE_COLORS[r.type]} 12%, transparent)`,
                              color: INVESTMENT_TYPE_COLORS[r.type],
                            }}
                          >
                            {investmentTypeLabel(r.type)}
                          </span>
                        </td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">{brl(r.invested_cents / 100)}</td>
                        <td className="py-3 text-right tabular-nums font-medium">{brl(r.current_cents / 100)}</td>
                        <td className={`py-3 text-right tabular-nums font-medium ${positive ? "text-success" : "text-destructive"}`}>
                          <span className="inline-flex items-center gap-1">
                            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                            {positive ? "+" : ""}{pct(ret, 2)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            aria-label="Excluir"
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Alocação por classe">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="valor" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {byType.map((p) => (<Cell key={p.type} fill={p.cor} />))}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.006 256)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {byType.map((p) => (
                <li key={p.type} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: p.cor }} />
                    {p.label}
                  </span>
                  <span className="font-semibold tabular-nums">{brl(p.valor)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}

function NewInvestmentDialog({ onDone }: { onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InvestmentInput>({
    name: "",
    type: "tesouro",
    invested: 0,
    current: 0,
    institution: "",
    notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createInvestment(form);
      toast.success("Investimento adicionado");
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Adicionar investimento</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-name">Nome do ativo</Label>
          <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tesouro Selic 2029" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InvestmentType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-inst">Instituição</Label>
            <Input id="inv-inst" value={form.institution ?? ""} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="XP, Nubank..." />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="inv-invested">Valor investido (R$)</Label>
            <Input id="inv-invested" type="number" step="0.01" min="0" value={form.invested || ""} onChange={(e) => setForm({ ...form, invested: Number(e.target.value) })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-current">Valor atual (R$)</Label>
            <Input id="inv-current" type="number" step="0.01" min="0" value={form.current || ""} onChange={(e) => setForm({ ...form, current: Number(e.target.value) })} required />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}