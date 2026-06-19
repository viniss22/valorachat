import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import { listTransactions, deleteTransaction, type TransactionRow } from "@/lib/transactions";
import { TransactionEditDialog } from "@/components/transaction-edit-dialog";
import { toast } from "sonner";

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
    try { await deleteTransaction(id); toast.success("Receita excluída"); qc.invalidateQueries({ queryKey: ["transactions"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <PageHeader title="Receitas" description="Tudo o que entra na sua conta. Registre novas entradas no botão flutuante (+)." />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total de Receitas" value={brl(totalCents / 100)} tone="success" hint={`${receitas.length} entradas`} />
        <StatCard label="Fontes" value={String(fontes.length)} hint="Categorias diferentes" />
        <StatCard label="Ticket Médio" value={receitas.length ? brl(totalCents / 100 / receitas.length) : brl(0)} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Por fonte" className="lg:col-span-1">
          {fontes.length === 0 ? <p className="text-sm text-muted-foreground">Sem receitas registradas.</p> : (
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
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : receitas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toque no botão + para registrar a primeira receita.</p>
          ) : (
            <ul className="divide-y divide-border">
              {receitas.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">+</div>
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