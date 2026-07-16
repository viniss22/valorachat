import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil, TrendingUp, Layers, Wallet, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import { listTransactions, deleteTransaction, type TransactionRow } from "@/lib/transactions";
import { TransactionEditDialog } from "@/components/transaction-edit-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app/receitas")({
  head: () => ({ meta: [{ title: "Receitas — FinanceChat" }] }),
  component: ReceitasPage,
});

function ReceitasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const { data: txs = [], isLoading } = useQuery({ queryKey: ["transactions"], queryFn: listTransactions });
  const receitas = txs.filter((t) => t.kind === "receita");
  const totalCents = receitas.reduce((s, t) => s + t.amount_cents, 0);
  const fontes = Object.entries(receitas.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount_cents; return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta receita?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Receita excluída", { description: "O lançamento foi removido do seu histórico." });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      toast.error("Não foi possível excluir", { description: (e as Error).message });
    }
  }

  return (
    <>
      <PageHeader title="Receitas" description="Tudo o que entra na sua conta. Registre novas entradas no botão flutuante (+)." />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total de Receitas" value={brl(totalCents / 100)} hint={`${receitas.length} entradas`} icon={Wallet} gradient />
        <StatCard label="Fontes" value={String(fontes.length)} hint="Categorias diferentes" icon={Layers} tone="primary" />
        <StatCard label="Ticket Médio" value={receitas.length ? brl(totalCents / 100 / receitas.length) : brl(0)} icon={TrendingUp} tone="success" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Por fonte" className="lg:col-span-1">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : fontes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {fontes.map(([name, cents]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{name}</span><span className="tabular-nums text-muted-foreground">{brl(cents / 100)}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-success" style={{ width: `${(cents / totalCents) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Receitas recentes" className="lg:col-span-2">
          {isLoading ? (
            <ul className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-2 w-1/3" /></div>
                  <Skeleton className="h-4 w-16" />
                </li>
              ))}
            </ul>
          ) : receitas.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-border">
              {receitas.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-md">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success"><ArrowDownToLine className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.description}</p><p className="text-xs text-muted-foreground">{t.category} · {dateBR(t.transaction_date)}{t.source === "whatsapp" && " · via WhatsApp"}</p></div>
                  <span className="text-sm font-semibold tabular-nums text-success">+ {brl(t.amount_cents / 100)}</span>
                  <button onClick={() => setEditing(t)} aria-label="Editar" className="text-muted-foreground hover:text-primary"><Pencil className="size-4" /></button>
                  <button onClick={() => handleDelete(t.id)} aria-label="Excluir" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <TransactionEditDialog tx={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
        <ArrowDownToLine className="size-5" />
      </div>
      <p className="text-sm font-medium">Nenhuma receita ainda</p>
      <p className="max-w-xs text-xs text-muted-foreground">Toque no botão <strong>+</strong> ou envie uma mensagem no WhatsApp para registrar sua primeira entrada.</p>
    </div>
  );
}