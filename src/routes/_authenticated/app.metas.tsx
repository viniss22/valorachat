import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trophy, X, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import { listGoals, createGoal, deleteGoal, contributeGoal, estimateCompletion } from "@/lib/goals";

export const Route = createFileRoute("/_authenticated/app/metas")({
  head: () => ({ meta: [{ title: "Metas Financeiras — FinanceChat" }] }),
  component: MetasPage,
});

function MetasPage() {
  const qc = useQueryClient();
  const { data: metas = [], isLoading } = useQuery({ queryKey: ["goals"], queryFn: listGoals });
  const [aporteOpen, setAporteOpen] = useState<string | null>(null);
  const [valorAporte, setValorAporte] = useState("");
  const [novaOpen, setNovaOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["goals"] });

  const aportarMut = useMutation({
    mutationFn: ({ id, v }: { id: string; v: number }) => contributeGoal(id, v),
    onSuccess: () => { toast.success("Aporte registrado"); invalidate(); setAporteOpen(null); setValorAporte(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const createMut = useMutation({
    mutationFn: createGoal,
    onSuccess: () => { toast.success("Meta criada"); invalidate(); setNovaOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { toast.success("Meta excluída"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalAlvo = metas.reduce((s, m) => s + m.target_cents, 0) / 100;
  const totalAcumulado = metas.reduce((s, m) => s + m.accumulated_cents, 0) / 100;
  const completas = metas.filter((m) => m.accumulated_cents >= m.target_cents).length;

  function criarMeta(form: FormData) {
    const title = String(form.get("titulo") || "").trim();
    const target = parseFloat(String(form.get("alvo") || "0").replace(",", "."));
    const deadline = String(form.get("prazo") || "") || null;
    if (!title || !target) return;
    createMut.mutate({ title, target, deadline });
  }

  return (
    <>
      <PageHeader
        title="Metas Financeiras"
        description="Defina objetivos, acompanhe o progresso e celebre cada conquista."
        actions={
          <button onClick={() => setNovaOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" /> Nova Meta
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total das Metas" value={brl(totalAlvo)} tone="primary" />
        <StatCard label="Acumulado" value={brl(totalAcumulado)} tone="success" hint={totalAlvo > 0 ? `${((totalAcumulado / totalAlvo) * 100).toFixed(0)}% do objetivo total` : ""} />
        <StatCard label="Metas Concluídas" value={`${completas} de ${metas.length}`} hint="Continue firme! 🚀" />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando metas…</p>}
      {!isLoading && metas.length === 0 && (
        <Section title="Comece agora">
          <p className="text-sm text-muted-foreground">Você ainda não tem metas. Clique em <strong>Nova Meta</strong> para criar a primeira.</p>
        </Section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {metas.map((m) => {
          const pct = Math.min(100, Math.round((m.accumulated_cents / m.target_cents) * 100));
          const completa = m.accumulated_cents >= m.target_cents;
          const restante = Math.max(0, m.target_cents - m.accumulated_cents) / 100;
          // Estimativa: usa criação como base (simplificado) – ritmo = acumulado / meses desde a criação
          const months = Math.max(1, Math.round((Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
          const monthlyAvg = m.accumulated_cents / months;
          const eta = estimateCompletion(m, monthlyAvg);
          return (
            <div key={m.id} className="rounded-xl bg-card p-6 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`grid size-10 place-items-center rounded-lg ${completa ? "bg-success/10 text-success" : "bg-accent text-primary"}`}>
                    {completa ? <Trophy className="size-5" /> : <Target className="size-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{m.title}</h3>
                    {m.deadline && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" /> Prazo: {dateBR(m.deadline)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-semibold tabular-nums ${completa ? "text-success" : "text-foreground"}`}>{pct}%</span>
                  <button onClick={() => { if (confirm("Excluir esta meta?")) deleteMut.mutate(m.id); }} className="text-muted-foreground hover:text-destructive" aria-label="Excluir meta">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: m.color ?? "var(--primary)" }} />
              </div>

              <div className="mt-3 flex items-end justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{brl(m.accumulated_cents / 100)}</span> de {brl(m.target_cents / 100)}
                </span>
                <span className="text-xs text-muted-foreground">Faltam {brl(restante)}</span>
              </div>
              {eta && (
                <p className="mt-1 text-xs text-primary">Conclusão estimada: {eta}</p>
              )}

              {aporteOpen === m.id ? (
                <div className="mt-4 flex gap-2">
                  <input autoFocus type="text" placeholder="Valor do aporte (R$)" value={valorAporte} onChange={(e) => setValorAporte(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <button onClick={() => {
                    const v = parseFloat(valorAporte.replace(",", "."));
                    if (!v || v <= 0) return toast.error("Valor inválido");
                    aportarMut.mutate({ id: m.id, v });
                  }} disabled={aportarMut.isPending} className="rounded-md bg-success px-3 py-2 text-sm font-medium text-success-foreground">Aportar</button>
                  <button onClick={() => setAporteOpen(null)} className="rounded-md border border-border px-2 py-2 text-muted-foreground"><X className="size-4" /></button>
                </div>
              ) : (
                !completa && (
                  <button onClick={() => setAporteOpen(m.id)} className="mt-4 w-full rounded-md border border-border bg-muted/40 py-2 text-sm font-medium hover:bg-muted">
                    + Adicionar aporte
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {novaOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setNovaOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} action={criarMeta} className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-black/5">
            <h2 className="text-lg font-semibold">Nova Meta Financeira</h2>
            <p className="mt-1 text-sm text-muted-foreground">Defina um objetivo claro para conquistar.</p>
            <div className="mt-4 space-y-3">
              <input name="titulo" placeholder="Ex: Viagem para o Japão" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input name="alvo" placeholder="Valor alvo (R$)" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input name="prazo" type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNovaOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={createMut.isPending} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Criar Meta</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}