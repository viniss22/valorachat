import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Check, Pencil, X, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/assistente")({
  head: () => ({ meta: [{ title: "Val — Valora" }] }),
  component: AssistentePage,
});

/** Sugestões mistas: registrar E perguntar. */
const SUGESTOES = [
  "gastei 50 no almoço",
  "recebi 1200 de honorários",
  "Quanto gastei em Lazer este mês?",
  "Quanto posso gastar até o fim do mês sem estourar o orçamento?",
];

const CATEGORIAS_DESPESA = [
  "Alimentação", "Moradia", "Transporte", "Lazer", "Saúde",
  "Educação", "Assinaturas", "Compras", "Outro",
];

const CATEGORIAS_RECEITA = [
  "Salário", "Honorários", "Dividendos", "Aluguéis", "Vendas",
];

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Parsed = {
  amount: number;
  category: string;
  type: "receita" | "despesa";
  description: string;
};

/** Mensagem vinda do histórico salvo (conversas anteriores). */
type Historico = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: "text" | "capture";
  capture_status: string | null;
};

/** Cartão de captura ancorado a uma posição da conversa. */
type Captura = {
  id: string;
  anchor: number;
  userText: string;
  estado: "processando" | "criada" | "confirmar" | "editando" | "cancelada" | "erro";
  summary?: string;
  hint?: string;
  parsed?: Parsed;
};

function AssistentePage() {
  const [input, setInput] = useState("");
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  });

  const loading = ocupado || status === "submitted" || status === "streaming";
  const vazio = messages.length === 0 && capturas.length === 0 && historico.length === 0;

  /** Nome real do usuário — sem "Ricardo" hardcoded. */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const full = typeof meta.full_name === "string" ? meta.full_name : "";
      setNome(full || (u.email ? u.email.split("@")[0] : ""));
    })();
  }, []);

  /** Carrega a conversa anterior ao abrir a tela. */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chat/history", { headers: await authHeaders() });
        const data = await res.json();
        setHistorico(data.messages ?? []);
      } catch {
        // Falha ao carregar histórico não bloqueia o uso do chat.
      } finally {
        setCarregandoHistorico(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function limparConversa() {
    if (!confirm("Apagar toda a conversa? Seus lançamentos não serão afetados.")) return;
    try {
      await fetch("/api/chat/history", { method: "DELETE", headers: await authHeaders() });
      setHistorico([]);
      setCapturas([]);
      toast.success("Conversa apagada");
    } catch {
      toast.error("Não consegui apagar a conversa");
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, capturas, status, historico]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const iniciais =
    (nome || "")
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "EU";

  async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const base: Record<string, string> = { "content-type": "application/json" };
    if (token) base.Authorization = `Bearer ${token}`;
    return base;
  }

  function atualizar(id: string, patch: Partial<Captura>) {
    setCapturas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  /**
   * Fluxo unificado: toda mensagem passa primeiro pelo /api/capture.
   * É lançamento? vira card. É pergunta? segue para /api/chat (streaming).
   */
  async function enviar(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");
    setOcupado(true);

    const id = `cap-${Date.now()}`;
    const anchor = messages.length;
    setCapturas((prev) => [...prev, { id, anchor, userText: t, estado: "processando" }]);

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();

      if (data.status === "created") {
        atualizar(id, { estado: "criada", summary: data.summary });
        queryClient.invalidateQueries();
        toast.success("Lançamento registrado", { description: data.summary });
      } else if (data.status === "needs_confirmation") {
        atualizar(id, { estado: "confirmar", summary: data.summary, parsed: data.parsed });
      } else {
        // Não é lançamento → é pergunta: remove o card e manda pro assistente.
        setCapturas((prev) => prev.filter((c) => c.id !== id));
        await sendMessage({ text: t });
      }
    } catch {
      atualizar(id, { estado: "erro", hint: "Falha de conexão. Tente novamente." });
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar(c: Captura, valores: Parsed) {
    atualizar(c.id, { estado: "processando" });
    try {
      const res = await fetch("/api/capture/confirm", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(valores),
      });
      const data = await res.json();
      if (data.status === "created") {
        atualizar(c.id, { estado: "criada", summary: data.summary });
        queryClient.invalidateQueries();
        toast.success("Lançamento registrado", { description: data.summary });
      } else {
        atualizar(c.id, { estado: "erro", hint: data.hint ?? "Erro ao registrar." });
      }
    } catch {
      atualizar(c.id, { estado: "erro", hint: "Falha de conexão." });
    }
  }

  const capturasEm = (anchor: number) => capturas.filter((c) => c.anchor === anchor);

  const cardProps = (c: Captura) => ({
    c,
    iniciais,
    onConfirmar: confirmar,
    onEditar: () => atualizar(c.id, { estado: "editando" as const }),
    onCancelar: () => atualizar(c.id, { estado: "cancelada" as const }),
  });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <PageHeader
        title="Val"
        description="Sua assistente financeira. Escreva como fala — eu registro e respondo."
        actions={
          historico.length > 0 || messages.length > 0 ? (
            <button
              onClick={limparConversa}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Apagar a conversa (os lançamentos não são afetados)"
            >
              <Trash2 className="size-4" /> Limpar conversa
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
        <div className="flex-1 overflow-y-auto p-6">
          {vazio ? (
            <div className="mx-auto max-w-xl py-12 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                <Sparkles className="size-7" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">
                Oi{nome ? `, ${nome.split(" ")[0]}` : ""}! Sou a Val 👋
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Escreva como você fala: <em>“gastei 50 no almoço”</em> registra na hora.
                Ou pergunte sobre saldo, metas e gastos.
              </p>
              <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-lg border border-border bg-background px-4 py-3 text-left text-sm hover:border-primary/40 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Conversas anteriores (carregadas do banco) */}
              {historico.map((h) => (
                <MensagemHistorico key={h.id} h={h} iniciais={iniciais} />
              ))}

              {historico.length > 0 && (messages.length > 0 || capturas.length > 0) && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    agora
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {capturasEm(0).map((c) => (
                <CardCaptura key={c.id} {...cardProps(c)} />
              ))}

              {messages.map((m, i) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className="space-y-6">
                    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          isUser ? "bg-accent text-primary" : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {isUser ? iniciais : "Val"}
                      </div>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          isUser
                            ? "rounded-tr-none bg-primary text-primary-foreground"
                            : "rounded-tl-none bg-muted text-foreground"
                        }`}
                      >
                        {isUser ? (
                          <p>{text}</p>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-foreground">
                            <ReactMarkdown>{text || "…"}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>

                    {capturasEm(i + 1).map((c) => (
                      <CardCaptura key={c.id} {...cardProps(c)} />
                    ))}
                  </div>
                );
              })}

              {status === "submitted" && (
                <div className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    IA
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Analisando…
                  </div>
                </div>
              )}
              {error && (
                <p className="text-center text-xs text-destructive">
                  Erro ao gerar resposta. Tente novamente em instantes.
                </p>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="border-t border-border bg-background/60 p-4"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: gastei 50 no almoço — ou pergunte algo…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={loading}
              maxLength={280}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
            As respostas podem conter imprecisões.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Mensagem vinda do histórico. Cartões de captura antigos aparecem como
 * resultado final (registrado/cancelado) — não faz sentido mostrar botões
 * de confirmação para algo que já foi decidido.
 */
function MensagemHistorico({ h, iniciais }: { h: Historico; iniciais: string }) {
  const isUser = h.role === "user";

  if (h.kind === "capture") {
    const registrado = h.capture_status === "created";
    return (
      <div className="flex gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          IA
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-2xl rounded-tl-none px-4 py-3 text-sm ${
            registrado
              ? "border border-emerald-500/20 bg-emerald-500/10"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {registrado && <Check className="size-4 shrink-0 text-emerald-600" />}
          <span className={registrado ? "font-medium" : ""}>{h.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
          isUser ? "bg-accent text-primary" : "bg-primary text-primary-foreground"
        }`}
      >
        {isUser ? iniciais : "Val"}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "rounded-tr-none bg-primary text-primary-foreground"
            : "rounded-tl-none bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p>{h.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-foreground">
            <ReactMarkdown>{h.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function CardCaptura({
  c,
  iniciais,
  onConfirmar,
  onEditar,
  onCancelar,
}: {
  c: Captura;
  iniciais: string;
  onConfirmar: (c: Captura, v: Parsed) => void;
  onEditar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-row-reverse gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-primary">
          {iniciais}
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <p>{c.userText}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          IA
        </div>
        <div className="max-w-[80%] flex-1">
          {c.estado === "processando" && (
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Registrando…
            </div>
          )}

          {c.estado === "criada" && (
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-none border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{c.summary ?? "Registrado"}</span>
            </div>
          )}

          {c.estado === "confirmar" && c.parsed && (
            <div className="rounded-2xl rounded-tl-none border border-border bg-muted/60 p-4">
              <p className="text-sm">
                Entendi <strong>{c.summary}</strong>. Confirma?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => onConfirmar(c, c.parsed!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="size-3.5" /> Confirmar
                </button>
                <button
                  onClick={onEditar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Pencil className="size-3.5" /> Editar
                </button>
                <button
                  onClick={onCancelar}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
              </div>
            </div>
          )}

          {c.estado === "editando" && c.parsed && (
            <FormEdicao
              inicial={c.parsed}
              onSalvar={(v) => onConfirmar(c, v)}
              onCancelar={onCancelar}
            />
          )}

          {c.estado === "cancelada" && (
            <div className="inline-flex rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-xs text-muted-foreground">
              Cancelado. Nada foi registrado.
            </div>
          )}

          {c.estado === "erro" && (
            <div className="inline-flex rounded-2xl rounded-tl-none border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm">
              {c.hint ?? "Não consegui registrar."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormEdicao({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial: Parsed;
  onSalvar: (v: Parsed) => void;
  onCancelar: () => void;
}) {
  const [amount, setAmount] = useState(String(inicial.amount));
  const [type, setType] = useState<"receita" | "despesa">(inicial.type);
  const [category, setCategory] = useState(inicial.category);
  const [description, setDescription] = useState(inicial.description);

  const categorias = type === "despesa" ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;

  useEffect(() => {
    if (!categorias.includes(category)) setCategory(categorias[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const valor = Number(amount.replace(",", "."));
  const valido = Number.isFinite(valor) && valor > 0;

  return (
    <div className="rounded-2xl rounded-tl-none border border-border bg-muted/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground">
          Valor
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
          {valido && (
            <span className="mt-1 block text-[10px] text-muted-foreground">
              {BRL.format(valor)}
            </span>
          )}
        </label>

        <label className="text-xs font-medium text-muted-foreground">
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "receita" | "despesa")}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </label>

        <label className="text-xs font-medium text-muted-foreground">
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-muted-foreground">
          Descrição
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          disabled={!valido}
          onClick={() => onSalvar({ amount: valor, category, type, description })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          <Check className="size-3.5" /> Salvar
        </button>
        <button
          onClick={onCancelar}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <X className="size-3.5" /> Cancelar
        </button>
      </div>
    </div>
  );
}
