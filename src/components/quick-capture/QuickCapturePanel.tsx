import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, CheckCircle2, XCircle, MessageSquarePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendingParsed {
  amount: number;
  category: string;
  type: "receita" | "despesa";
  description: string;
}

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; kind: "info"; text: string }
  | { id: string; role: "assistant"; kind: "success"; text: string; detail?: string }
  | { id: string; role: "assistant"; kind: "error"; text: string }
  | {
      id: string;
      role: "assistant";
      kind: "confirm";
      text: string;
      parsed: PendingParsed;
      resolved?: "confirmed" | "cancelled";
    };

const SUGGESTIONS = [
  "gastei 45 no almoço",
  "recebi 2500 de salário",
  "paguei 89,90 na farmácia",
  "uber pra casa 22",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { "content-type": "application/json", Authorization: `Bearer ${token}` }
    : { "content-type": "application/json" };
}

export function QuickCapturePanel({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function push(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    push({ id: uid(), role: "user", text: trimmed });
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        push({ id: uid(), role: "assistant", kind: "error", text: data.hint ?? "Erro ao processar." });
      } else if (data.status === "rejected") {
        push({ id: uid(), role: "assistant", kind: "error", text: data.hint });
      } else if (data.status === "needs_confirmation") {
        push({
          id: uid(),
          role: "assistant",
          kind: "confirm",
          text: `Entendi: ${data.summary}. Confirma?`,
          parsed: data.parsed,
        });
      } else if (data.status === "created") {
        push({
          id: uid(),
          role: "assistant",
          kind: "success",
          text: `Registrado: ${data.summary}`,
          detail: brl(data.transaction.amount),
        });
        toast.success("Movimentação registrada", { description: data.summary });
        invalidate();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha de rede.";
      push({ id: uid(), role: "assistant", kind: "error", text: msg });
    } finally {
      setSending(false);
    }
  }

  async function confirmPending(msgId: string, parsed: PendingParsed) {
    setSending(true);
    try {
      const res = await fetch("/api/capture/confirm", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "created") {
        push({ id: uid(), role: "assistant", kind: "error", text: data.hint ?? "Falha ao registrar." });
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && m.role === "assistant" && m.kind === "confirm" ? { ...m, resolved: "confirmed" } : m)),
      );
      push({ id: uid(), role: "assistant", kind: "success", text: `Registrado: ${data.summary}` });
      toast.success("Movimentação registrada", { description: data.summary });
      invalidate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha de rede.";
      push({ id: uid(), role: "assistant", kind: "error", text: msg });
    } finally {
      setSending(false);
    }
  }

  function cancelPending(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.role === "assistant" && m.kind === "confirm" ? { ...m, resolved: "cancelled" } : m)),
    );
    push({ id: uid(), role: "assistant", kind: "info", text: "Ok, descartei essa." });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <MessageSquarePlus className="size-4" />
            </div>
            <div>
              <SheetTitle className="text-base">Registro rápido</SheetTitle>
              <SheetDescription className="text-xs">Digite em linguagem natural. A IA registra pra você.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pt-8 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                <Sparkles className="size-5" />
              </div>
              <p className="text-sm text-muted-foreground">Descreva a movimentação e eu registro.</p>
              <div className="mt-3 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-primary/40 hover:bg-accent"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                if (m.kind === "success") {
                  return (
                    <div key={m.id} className="flex items-start gap-2">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-success/20 bg-success/5 px-3 py-2 text-sm">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                if (m.kind === "error") {
                  return (
                    <div key={m.id} className="flex items-start gap-2">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
                        <XCircle className="size-4" />
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                if (m.kind === "info") {
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-muted px-3 py-2 text-sm text-muted-foreground">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                // confirm
                return (
                  <div key={m.id} className="space-y-2">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                        {m.text}
                      </div>
                    </div>
                    {!m.resolved && (
                      <div className="flex gap-2 pl-1">
                        <Button size="sm" onClick={() => confirmPending(m.id, m.parsed)} disabled={sending}>
                          Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancelPending(m.id)} disabled={sending}>
                          Descartar
                        </Button>
                      </div>
                    )}
                    {m.resolved === "cancelled" && (
                      <p className="pl-1 text-xs text-muted-foreground">Descartado</p>
                    )}
                    {m.resolved === "confirmed" && (
                      <p className="pl-1 text-xs text-success">Registrado ✓</p>
                    )}
                  </div>
                );
              })}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Analisando…
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-3"
        >
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: gastei 50 no almoço"
              maxLength={280}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}