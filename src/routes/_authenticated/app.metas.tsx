import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trophy, X, Calendar, Trash2, Loader2, PiggyBank, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { brl, dateBR } from "@/lib/format";
import { listGoals, createGoal, deleteGoal, contributeGoal, estimateCompletion } from "@/lib/goals";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    onSuccess: () => { toast.success("Aporte registrado", { description: "Sua meta ficou mais perto! 🎯" }); invalidate(); setAporteOpen(null); setValorAporte(""); },
    onError: (e: Error) => toast.error("Falha ao aportar", { description: e.message }),
  });
  const createMut = useMutation({
    mutationFn: createGoal,
    onSuccess: () => { toast.success("Meta criada", { description: "Comece a aportar quando quiser." }); invalidate(); setNovaOpen(false); },
    onError: (e: Error) => toast.error("Não foi possível criar", { description: e.message }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { toast.success("Meta excluída"); invalidate(); },
    onError: (e: Error) => toast.error("Não foi possível excluir", { description: e.message }),
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
        description="Escolha um objetivo e acompanhe o quanto falta."
        actions={
          <Button onClick={() => setNovaOpen(true)} className="gap-2">
            <Plus className="size-4" /> Nova Meta
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total das Metas" value={brl(totalAlvo)} icon={Target} gradient />
        <StatCard label="Acumulado" value={brl(totalAcumulado)} tone="success" icon={PiggyBank} hint={totalAlvo > 0 ? `${((totalAcumulado / totalAlvo) * 100).toFixed(0)}% do objetivo total` : "Crie sua primeira meta"} />
        <StatCard label="Metas Concluídas" value={`${completas} de ${metas.length}`} tone="primary" icon={Trophy} hint={completas > 0 ? "Continue assim!" : "A primeira é a mais difícil"} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card p-6 ring-1 ring-black/5 shadow-[var(--shadow-elegant)]">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
              </div>
              <Skeleton className="mt-5 h-2 w-full" />
              <div className="mt-3 flex justify-between"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-20" /></div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && metas.length === 0 && (
        <Section title="Comece agora">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><Target className="size-6" /></div>
            <p className="text-sm font-medium">Você ainda não tem metas</p>
            <p className="max-w-sm text-xs text-muted-foreground">Defina um objetivo — viagem, reserva, investimento — e acompanhe cada aporte.</p>
            <Button onClick={() => setNovaOpen(true)} className="mt-2 gap-2"><Plus className="size-4" /> Criar primeira meta</Button>
          </div>
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
            <div key={m.id} className="animate-fade-in rounded-2xl bg-card p-6 ring-1 ring-black/5 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`grid size-10 place-items-center rounded-xl ${completa ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                    {completa ? <Trophy className="size-5" /> : <Target className="size-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">{m.title}{completa && <CheckCircle2 className="size-4 text-success" />}</h3>
                    {m.deadline && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" /> Prazo: {dateBR(m.deadline)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-semibold tabular-nums ${completa ? "text-success" : "text-foreground"}`}>{pct}%</span>
                  <button
                    onClick={() => { if (confirm("Excluir esta meta?")) deleteMut.mutate(m.id); }}
                    disabled={deleteMut.isPending}
                    className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    aria-label="Excluir meta"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <Progress value={pct} className={`mt-5 h-2 ${completa ? "[&>div]:bg-success" : ""}`} />

              <div className="mt-3 flex items-end justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{brl(m.accumulated_cents / 100)}</span> de {brl(m.target_cents / 100)}
                </span>
                <span className={`text-xs ${completa ? "font-medium text-success" : "text-muted-foreground"}`}>{completa ? "Meta atingida! 🎉" : `Faltam ${brl(restante)}`}</span>
              </div>
              {eta && (
                <p className="mt-1 text-xs text-primary">Conclusão estimada: {eta}</p>
              )}

              {aporteOpen === m.id ? (
                <div className="mt-4 flex gap-2">
                  <Input autoFocus inputMode="decimal" placeholder="Valor do aporte (R$)" value={valorAporte} onChange={(e) => setValorAporte(e.target.value)} className="flex-1" />
                  <Button
                    onClick={() => {
                      const v = parseFloat(valorAporte.replace(",", "."));
                      if (!v || v <= 0) return toast.error("Valor inválido");
                      aportarMut.mutate({ id: m.id, v });
                    }}
                    disabled={aportarMut.isPending}
                    className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                  >
                    {aportarMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <PiggyBank className="size-4" />}
                    Aportar
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setAporteOpen(null)} aria-label="Cancelar"><X className="size-4" /></Button>
                </div>
              ) : (
                !completa && (
                  <Button variant="outline" onClick={() => setAporteOpen(m.id)} className="mt-4 w-full gap-2">
                    <Plus className="size-4" /> Adicionar aporte
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Meta Financeira</DialogTitle>
            <DialogDescription>Defina um objetivo claro para conquistar.</DialogDescription>
          </DialogHeader>
          <form action={criarMeta} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" placeholder="Ex: Viagem para o Japão" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alvo">Valor alvo (R$)</Label>
              <Input id="alvo" name="alvo" inputMode="decimal" placeholder="0,00" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prazo">Prazo (opcional)</Label>
              <Input id="prazo" name="prazo" type="date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNovaOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending} className="gap-2">
                {createMut.isPending && <Loader2 className="size-4 animate-spin" />}
                Criar Meta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}