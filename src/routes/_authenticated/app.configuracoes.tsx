import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Store, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useProfile, useUpdateBusinessMode } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Valora" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateBusinessMode();

  const [businessMode, setBusinessMode] = useState(false);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (profile) {
      setBusinessMode(profile.business_mode);
      setBusinessName(profile.business_name ?? "");
    }
  }, [profile]);

  async function salvar() {
    try {
      await update.mutateAsync({
        business_mode: businessMode,
        business_name: businessMode ? businessName.trim() || undefined : undefined,
      });
      toast.success("Configurações salvas");
    } catch {
      toast.error("Não consegui salvar. Tente novamente.");
    }
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Ajuste como o Valora funciona para você."
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Sou MEI / autônomo</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Separe os gastos do seu negócio dos pessoais. O assistente
                    passa a identificar sozinho quando um lançamento é da empresa,
                    e você vê o resultado do negócio separado das suas contas.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={businessMode}
                  onClick={() => setBusinessMode((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    businessMode ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white transition ${
                      businessMode ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {businessMode && (
                <div className="mt-4 space-y-1.5">
                  <label htmlFor="bname" className="text-xs font-medium text-muted-foreground">
                    Nome do negócio (opcional)
                  </label>
                  <input
                    id="bname"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex.: Salão da Vânia, Clínica X…"
                    maxLength={80}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Aparece nos relatórios que você gera para o contador.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {!businessMode && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <User className="size-4 shrink-0" />
            Modo pessoal: o Valora trata todos os lançamentos como seus gastos
            pessoais. Ative acima se você também tem um negócio.
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={salvar}
            disabled={isLoading || update.isPending}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {update.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </>
  );
}
