import { createFileRoute } from "@tanstack/react-router";
import { Phone, RefreshCw, CheckCircle2 } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { conversasWhatsapp, userProfile } from "@/lib/mock-data";

export const Route = createFileRoute("/app/whatsapp")({
  head: () => ({ meta: [{ title: "Central WhatsApp — FinanceChat" }] }),
  component: WhatsappPage,
});

function WhatsappPage() {
  return (
    <>
      <PageHeader
        title="Central WhatsApp"
        description="Registre receitas, despesas e consulte sua vida financeira conversando naturalmente."
        actions={
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
            <RefreshCw className="size-4" /> Sincronizar
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Número Conectado" value={userProfile.whatsappNumber} hint="Verificado pela Meta" tone="primary" />
        <StatCard label="Status" value="Conectado" tone="success" hint={`Última sincronização ${userProfile.lastSync}`} />
        <StatCard label="Mensagens (mês)" value="184" hint="142 registros · 42 consultas" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-whatsapp text-primary-foreground">
                  <Phone className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">FinanceChat Bot</h2>
                  <p className="text-xs text-muted-foreground">{userProfile.whatsappNumber}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold uppercase text-success">
                <CheckCircle2 className="size-3" /> IA Ativa
              </span>
            </div>
            <div className="space-y-6 bg-[oklch(0.96_0.01_140)] p-6">
              {conversasWhatsapp.map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-[#D9FDD3] p-3 shadow-sm">
                      <p className="text-sm text-zinc-800">{c.usuario}</p>
                      <span className="mt-1 block text-right text-[10px] text-zinc-500">{c.hora}</span>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-card p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        FinanceChat IA
                      </p>
                      <p className="mt-1 text-sm">{c.resposta}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Deseja consultar seu saldo ou visualizar seus gráficos?
                      </p>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{c.hora}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border bg-card p-4">
              <div className="rounded-full bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                Envie uma mensagem pelo WhatsApp para registrar...
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Como usar">
            <ul className="space-y-3 text-sm">
              {[
                "Gastei R$ 35,00 no almoço.",
                "Recebi R$ 1.500 do cliente.",
                "Paguei aluguel de R$ 1.800.",
                "Quanto gastei este mês?",
                "Qual meu saldo?",
                "Estou perto da minha meta?",
              ].map((ex) => (
                <li
                  key={ex}
                  className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground"
                >
                  &ldquo;{ex}&rdquo;
                </li>
              ))}
            </ul>
          </Section>

          <Section title="O que a IA detecta">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Valor da transação</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Categoria automática</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Receita ou despesa</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Descrição inteligente</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Alertas de metas</li>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}