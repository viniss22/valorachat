import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, RefreshCw, CheckCircle2, Unlink, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Section, StatCard } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dateBR } from "@/lib/format";
import {
  getWhatsappProfile, requestVerification, confirmVerification,
  disconnectWhatsapp, syncWhatsapp, formatPhoneBR, listAuditLogs,
} from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  head: () => ({ meta: [{ title: "Central WhatsApp — FinanceChat" }] }),
  component: WhatsappPage,
});

function WhatsappPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["whatsapp-profile"], queryFn: getWhatsappProfile });
  const { data: logs = [] } = useQuery({ queryKey: ["audit", "whatsapp"], queryFn: () => listAuditLogs(30) });

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["whatsapp-profile"] });
    qc.invalidateQueries({ queryKey: ["audit", "whatsapp"] });
  };

  const requestMut = useMutation({
    mutationFn: () => requestVerification(phone),
    onSuccess: ({ code }) => { setDemoCode(code); invalidate(); toast.success("Código de verificação gerado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const confirmMut = useMutation({
    mutationFn: () => confirmVerification(phone, code),
    onSuccess: () => { setCode(""); setDemoCode(null); setPhone(""); invalidate(); toast.success("WhatsApp conectado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const disconnectMut = useMutation({
    mutationFn: disconnectWhatsapp,
    onSuccess: () => { invalidate(); toast.success("WhatsApp desconectado"); },
  });
  const syncMut = useMutation({
    mutationFn: syncWhatsapp,
    onSuccess: () => { invalidate(); toast.success("Sincronizado"); },
  });

  const status = profile?.whatsapp_status ?? "nao_conectado";
  const statusLabel = status === "conectado" ? "Conectado" : status === "pendente" ? "Pendente de validação" : "Não conectado";
  const statusTone = status === "conectado" ? "success" : status === "pendente" ? "primary" : undefined;

  const whatsappAudit = logs.filter((l) => l.action.startsWith("whatsapp."));
  const txAudit = logs.filter((l) => l.action.startsWith("transaction."));

  return (
    <>
      <PageHeader
        title="Central WhatsApp"
        description="Vincule seu número e registre receitas e despesas pelo WhatsApp."
        actions={
          status === "conectado" && (
            <button onClick={() => syncMut.mutate()} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
              <RefreshCw className="size-4" /> Sincronizar
            </button>
          )
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Número" value={formatPhoneBR(profile?.whatsapp_number ?? null)} hint={profile?.whatsapp_verified_at ? `Validado em ${dateBR(profile.whatsapp_verified_at)}` : "Sem validação"} tone="primary" />
        <StatCard label="Status" value={statusLabel} tone={statusTone} hint={profile?.whatsapp_last_sync_at ? `Última sincronização ${dateBR(profile.whatsapp_last_sync_at)}` : "—"} />
        <StatCard label="Comandos pelo WhatsApp" value="6+" hint="Registrar, consultar, corrigir" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Vinculação do número">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : status === "conectado" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-success/10 p-3 text-sm text-success">
                  <ShieldCheck className="size-5" />
                  <div>
                    <p className="font-semibold">{formatPhoneBR(profile?.whatsapp_number ?? null)} validado</p>
                    <p className="text-xs">Você pode registrar movimentações enviando mensagens.</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => { if (confirm("Desvincular este número?")) disconnectMut.mutate(); }}>
                  <Unlink className="mr-2 size-4" /> Desvincular número
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Número de celular (com DDD)</label>
                  <div className="flex gap-2">
                    <Input placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Button onClick={() => requestMut.mutate()} disabled={requestMut.isPending || !phone}>
                      Enviar código
                    </Button>
                  </div>
                </div>

                {(status === "pendente" || demoCode) && (
                  <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                    {demoCode && (
                      <div className="flex items-start gap-2 text-xs text-primary">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <p>Modo demonstração — em produção este código é enviado para o WhatsApp. Seu código de teste: <strong className="font-mono tracking-widest">{demoCode}</strong></p>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Digite o código de 6 dígitos</label>
                      <div className="flex gap-2">
                        <Input maxLength={6} inputMode="numeric" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} className="tracking-widest font-mono" />
                        <Button onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending || code.length !== 6}>
                          Validar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="Histórico de alterações" action={<span className="text-xs text-muted-foreground">Auditoria</span>}>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros de auditoria ainda.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {[...whatsappAudit, ...txAudit].slice(0, 10).map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{labelFor(l.action)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground">{l.entity}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Comandos disponíveis">
            <ul className="space-y-3 text-sm">
              {[
                "Gastei R$ 35,00 no almoço.",
                "Recebi R$ 1.500 do cliente.",
                "Paguei aluguel de R$ 1.800.",
                "Quanto gastei este mês?",
                "Qual meu saldo?",
                "Estou perto da minha meta?",
                "Excluir último lançamento",
                "Corrigir último lançamento",
                "Remover despesa de R$ 50",
                "Cancelar lançamento",
              ].map((ex) => (
                <li key={ex} className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
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
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Correções e exclusões com confirmação</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Alertas de metas e limites</li>
            </ul>
          </Section>

          <Section title="Segurança">
            <p className="text-xs text-muted-foreground">
              Toda exclusão e correção solicitada pelo WhatsApp exige confirmação. Cada ação é registrada na auditoria para sua proteção.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-md bg-accent p-3 text-xs">
              <Phone className="size-4 text-primary" />
              <span>Conexão criptografada e isolada por conta.</span>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function labelFor(action: string): string {
  const map: Record<string, string> = {
    "whatsapp.code_requested": "Código de verificação solicitado",
    "whatsapp.verified": "WhatsApp validado",
    "whatsapp.disconnected": "WhatsApp desconectado",
    "transaction.create": "Lançamento criado",
    "transaction.update": "Lançamento editado",
    "transaction.delete": "Lançamento excluído",
  };
  return map[action] ?? action;
}