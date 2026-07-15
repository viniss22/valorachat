import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/assistente")({
  head: () => ({ meta: [{ title: "Assistente IA — FinanceChat" }] }),
  component: AssistentePage,
});

const SUGESTOES = [
  "Quanto gastei em Lazer este mês?",
  "Como está minha reserva de emergência?",
  "Vale a pena aumentar o aporte no Tesouro Selic?",
  "Quanto posso gastar até o fim do mês sem estourar o orçamento?",
];

function AssistentePage() {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const loading = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  async function enviar(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");
    await sendMessage({ text: t });
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <PageHeader
        title="Assistente IA"
        description="Converse sobre suas finanças. A IA conhece seu saldo, metas e investimentos."
      />

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-12 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                <Sparkles className="size-7" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">Olá, Ricardo 👋</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sou sua assistente financeira. Pergunte sobre saldo, metas, investimentos ou peça uma análise dos seus gastos.
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
              {messages.map((m) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                    <div className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${isUser ? "bg-accent text-primary" : "bg-primary text-primary-foreground"}`}>
                      {isUser ? "RS" : "IA"}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? "rounded-tr-none bg-primary text-primary-foreground" : "rounded-tl-none bg-muted text-foreground"}`}>
                      {isUser ? (
                        <p>{text}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-foreground">
                          <ReactMarkdown>{text || "…"}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {status === "submitted" && (
                <div className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">IA</div>
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
              placeholder="Pergunte sobre suas finanças…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={loading}
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
            Powered by Lovable AI · As respostas podem conter imprecisões.
          </p>
        </form>
      </div>
    </div>
  );
}