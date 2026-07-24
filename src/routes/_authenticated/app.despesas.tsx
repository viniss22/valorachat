import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Pencil, ArrowUpFromLine, Flame, Receipt, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import { listTransactions, deleteTransaction, CATEGORY_COLORS, type TransactionRow } from "@/lib/transactions";
import { TransactionEditDialog } from "@/components/transaction-edit-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated/app/despesas")({
  head: () => ({ meta: [{ title: "Despesas — FinanceChat" }] }),
  component: DespesasPage,
});

function DespesasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TransactionRow | null>(null);
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
      toast.success("Despesa excluída", { description: "Registro removido do histórico." });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      toast.error("Não foi possível excluir", { description: (e as Error).message });
    }
  }

  return (
    <>
      <PageHeader title="Despesas" description="Tudo o que sai da sua conta, em um lugar só." />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total de Despesas" value={brl(totalCents / 100)} hint={`${despesas.length} movimentações`} icon={ArrowUpFromLine} gradient />
        <StatCard label="Maior Categoria" value={biggest?.[0] ?? "—"} tone="danger" hint={biggest ? brl(biggest[1] / 100) : "Sem despesas"} icon={Flame} />
        <StatCard label="Ticket Médio" value={despesas.length ? brl(totalCents / 100 / despesas.length) : brl(0)} tone="primary" icon={Receipt} />
      </div>
      <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="Por categoria" className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : byCategory.length === 0 ? (
            <EmptyDespesas />
          ) : (
            <div className="space-y-4">{byCategory.map(([name, cents]) => {
              const pct = (cents / totalCents) * 100;
              return (
                <div key={name} className="group flex items-center gap-4">
                  <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{name}</span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="h-2 flex-1 cursor-help overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-500 group-hover:opacity-90" style={{ width: `${pct}%`, background: CATEGORY_COLORS[name] ?? "var(--primary)" }} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><span className="text-xs font-medium">{name}: {brl(cents/100)} · {pct.toFixed(1)}%</span></TooltipContent>
                  </UITooltip>
                  <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">{brl(cents / 100)}</span>
                </div>
              );
            })}</div>
          )}
        </Section>
        <Section title="Sugestões da IA" action={<Sparkles className="size-4 text-primary" />}>
          <div className="rounded-xl bg-gradient-to-br from-accent to-muted/40 p-4 text-xs text-muted-foreground">
            {(() => {
              // Insight só vale se houver dados suficientes para significar algo.
              // Com 2-3 lançamentos, qualquer "concentração" é ruído estatístico.
              const MIN_LANCAMENTOS = 5;
              if (despesas.length === 0)
                return "Registre suas primeiras despesas e eu começo a apontar padrões por aqui.";
              if (despesas.length < MIN_LANCAMENTOS)
                return `Estou observando. A partir de ${MIN_LANCAMENTOS} lançamentos consigo identificar padrões nos seus gastos.`;
              if (!biggest) return "Continue registrando para receber análises personalizadas.";

              const pct = (biggest[1] / totalCents) * 100;

              // Caso especial: muita coisa em "Outro" indica falha de
              // categorização, não comportamento de consumo. Sugerir "revisar
              // o orçamento de Outros" seria um conselho vazio.
              if (biggest[0] === "Outro" && pct >= 30)
                return `${pct.toFixed(0)}% dos seus gastos estão em "Outro". Toque no lápis de cada lançamento para ajustar a categoria — quanto mais preciso, melhores ficam as análises.`;

              if (pct >= 40)
                return `${biggest[0]} concentra ${pct.toFixed(0)}% dos seus gastos do período (${brl(biggest[1] / 100)}). Vale conferir se está dentro do que você esperava.`;

              return `Seus gastos estão bem distribuídos entre as categorias — a maior é ${biggest[0]}, com ${pct.toFixed(0)}%.`;
            })()}
          </div>
        </Section>
      </div>
      </TooltipProvider>
      <Section title="Despesas recentes" className="mt-6">
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
        ) : despesas.length === 0 ? (
          <EmptyDespesas />
        ) : (
          <ul className="divide-y divide-border">{despesas.map((t) => (
            <li key={t.id} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/40">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><ArrowUpFromLine className="size-4" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.description}</p><p className="text-xs text-muted-foreground">{t.category} · {dateBR(t.transaction_date)}{(t.source === "app_chat" || t.source === "whatsapp") && " · pelo assistente"}</p>
                    {t.scope === "empresa" && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Empresa
                      </span>
                    )}
                    <p className="hidden"></p></div>
              <span className="text-sm font-semibold tabular-nums">− {brl(t.amount_cents / 100)}</span>
              <button onClick={() => setEditing(t)} aria-label="Editar" className="text-muted-foreground hover:text-primary"><Pencil className="size-4" /></button>
              <button onClick={() => handleDelete(t.id)} aria-label="Excluir" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </li>))}</ul>
        )}
      </Section>
      <TransactionEditDialog tx={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
    </>
  );
}

function EmptyDespesas() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <ArrowUpFromLine className="size-5" />
      </div>
      <p className="text-sm font-medium">Sua primeira despesa começa aqui</p>
      <p className="max-w-xs text-xs text-muted-foreground">Toque no <strong>+</strong> para preencher, ou diga ao <strong>Assistente</strong>: <em>“gastei 50 no almoço”</em>. Ele entende e registra pra você.</p>
    </div>
  );
}