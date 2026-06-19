import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Target, Trophy, X, Calendar } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { metas as metasIniciais, type Meta } from "@/lib/mock-data";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/metas")({
  head: () => ({ meta: [{ title: "Metas Financeiras — FinanceChat" }] }),
  component: MetasPage,
});

function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>(metasIniciais);
  const [aporteOpen, setAporteOpen] = useState<string | null>(null);
  const [valorAporte, setValorAporte] = useState("");
  const [novaOpen, setNovaOpen] = useState(false);

  const totalAlvo = metas.reduce((s, m) => s + m.alvo, 0);
  const totalAcumulado = metas.reduce((s, m) => s + m.acumulado, 0);
  const completas = metas.filter((m) => m.acumulado >= m.alvo).length;

  function aportar(id: string) {
    const v = parseFloat(valorAporte.replace(",", "."));
    if (!v || v <= 0) return;
    setMetas((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, acumulado: Math.min(m.alvo, m.acumulado + v) } : m,
      ),
    );
    setValorAporte("");
    setAporteOpen(null);
  }

  function criarMeta(form: FormData) {
    const titulo = String(form.get("titulo") || "");
    const alvo = parseFloat(String(form.get("alvo") || "0").replace(",", "."));
    const prazo = String(form.get("prazo") || "");
    if (!titulo || !alvo) return;
    setMetas((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        titulo,
        alvo,
        acumulado: 0,
        prazo,
        cor: "var(--primary)",
      },
    ]);
    setNovaOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Metas Financeiras"
        description="Defina objetivos, acompanhe o progresso e celebre cada conquista."
        actions={
          <button
            onClick={() => setNovaOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" /> Nova Meta
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total das Metas" value={brl(totalAlvo)} tone="primary" />
        <StatCard
          label="Acumulado"
          value={brl(totalAcumulado)}
          tone="success"
          hint={`${((totalAcumulado / totalAlvo) * 100).toFixed(0)}% do objetivo total`}
        />
        <StatCard
          label="Metas Concluídas"
          value={`${completas} de ${metas.length}`}
          hint="Continue firme! 🚀"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {metas.map((m) => {
          const pct = Math.min(100, Math.round((m.acumulado / m.alvo) * 100));
          const completa = m.acumulado >= m.alvo;
          return (
            <div key={m.id} className="rounded-xl bg-card p-6 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`grid size-10 place-items-center rounded-lg ${completa ? "bg-success/10 text-success" : "bg-accent text-primary"}`}>
                    {completa ? <Trophy className="size-5" /> : <Target className="size-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{m.titulo}</h3>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3" /> Prazo: {m.prazo}
                    </p>
                  </div>
                </div>
                <span className={`text-2xl font-semibold tabular-nums ${completa ? "text-success" : "text-foreground"}`}>{pct}%</span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: m.cor }} />
              </div>

              <div className="mt-3 flex items-end justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{brl(m.acumulado)}</span> de {brl(m.alvo)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Faltam {brl(Math.max(0, m.alvo - m.acumulado))}
                </span>
              </div>

              {aporteOpen === m.id ? (
                <div className="mt-4 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Valor do aporte"
                    value={valorAporte}
                    onChange={(e) => setValorAporte(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <button onClick={() => aportar(m.id)} className="rounded-md bg-success px-3 py-2 text-sm font-medium text-success-foreground">Aportar</button>
                  <button onClick={() => setAporteOpen(null)} className="rounded-md border border-border px-2 py-2 text-muted-foreground"><X className="size-4" /></button>
                </div>
              ) : (
                !completa && (
                  <button
                    onClick={() => setAporteOpen(m.id)}
                    className="mt-4 w-full rounded-md border border-border bg-muted/40 py-2 text-sm font-medium hover:bg-muted"
                  >
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
          <form
            onClick={(e) => e.stopPropagation()}
            action={criarMeta}
            className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-black/5"
          >
            <h2 className="text-lg font-semibold">Nova Meta Financeira</h2>
            <p className="mt-1 text-sm text-muted-foreground">Defina um objetivo claro para conquistar.</p>
            <div className="mt-4 space-y-3">
              <input name="titulo" placeholder="Ex: Viagem para o Japão" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input name="alvo" placeholder="Valor alvo (R$)" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input name="prazo" placeholder="Prazo (Ex: Dez/2027)" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNovaOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancelar</button>
              <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Criar Meta</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}