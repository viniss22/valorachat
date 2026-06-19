import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import { listTransactions, deleteTransaction, CATEGORY_COLORS } from "@/lib/transactions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/despesas")({
  head: () => ({ meta: [{ title: "Despesas — FinanceChat" }] }),
  component: DespesasPage,
});

function DespesasPage() {
  const qc = useQueryClient();
  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: listTransactions,
  });

  const despesas = txs.filter((t) => t.kind === "despesa");
  const totalCents = despesas.reduce((s, t) => s + t.amount_cents, 0);
  const byCategory = Object.entries(
    despesas.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount_cents;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const biggest = byCategory[0];

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta despesa? Esta ação fica registrada na auditoria.")) return;
    try {
      await deleteTransaction(id);
      toast.success("Despesa excluída");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Despesas" description="Suas despesas reais — registradas no botão flutuante (+) ou via WhatsApp." />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total de Despesas" value={brl(totalCents / 100)} hint={`${despesas.length} movimentações`} />
        <StatCard label="Maior Categoria" value={biggest?.[0] ?? "—"} tone="primary" hint={biggest ? brl(biggest[1] / 100) : ""} />
        <StatCard label="Ticket Médio" value={despesas.length ? brl(totalCents / 100 / despesas.length) : brl(0)} tone="success" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Por categoria" className="lg:col-span-2">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem despesas registradas ainda.</p>
          ) : (
            <div className="space-y-4">{byCategory.map(([name, cents]) => (
              <div key={name} className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(cents / totalCents) * 100}%`, background: CATEGORY_COLORS[name] ?? "var(--primary)" }} /></div>
                <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">{brl(cents / 100)}</span>
              </div>))}</div>
          )}
        </Section>
        <Section title="Sugestões da IA">
          <ul className="space-y-3 text-sm">
            <li className="rounded-lg bg-accent p-3 text-xs text-muted-foreground">As sugestões aparecerão após você registrar algumas despesas.</li>
          </ul>
        </Section>
      </div>
      <Section title="Despesas recentes" className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : despesas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Toque no botão + para registrar a primeira despesa.</p>
        ) : (
          <ul className="divide-y divide-border">{despesas.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">−</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.description}</p><p className="text-xs text-muted-foreground">{t.category} · {dateBR(t.transaction_date)}{t.source === "whatsapp" && " · via WhatsApp"}</p></div>
              <span className="text-sm font-semibold tabular-nums">− {brl(t.amount_cents / 100)}</span>
              <button onClick={() => handleDelete(t.id)} aria-label="Excluir" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </li>))}</ul>
        )}
      </Section>
    </>
  );
}