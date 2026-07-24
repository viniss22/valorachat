import { useState } from "react";
import { useProfile } from "@/lib/use-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  CATEGORIES_EXPENSE, CATEGORIES_INCOME, PAYMENT_METHODS, CATEGORIES_BUSINESS,
  createTransaction,
} from "@/lib/transactions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionFab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"receita" | "despesa">("despesa");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<"pessoal" | "empresa">("pessoal");
  const [txDate, setTxDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [method, setMethod] = useState<string>("");
  const [hasInstallments, setHasInstallments] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState("");

  const { data: profile } = useProfile();
  const isMEI = profile?.business_mode ?? false;

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      toast.success("Movimentação registrada", { description: "Adicionamos ao seu histórico." });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setOpen(false);
      setAmount(""); setDescription(""); setCategory(""); setNotes("");
      setMethod(""); setHasInstallments(false); setInstallments(1);
      setDueDate(""); setReceivedDate(""); setScope("pessoal");
    },
    onError: (err: Error) => toast.error("Falha ao registrar", { description: err.message }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    mutation.mutate({
      kind,
      amount: parsedAmount,
      description,
      category,
      scope,
      transaction_date: txDate,
      due_date: dueDate || null,
      received_date: receivedDate || null,
      payment_method: (method || null) as TransactionMethodLike,
      installments_total: hasInstallments ? installments : 1,
      notes: notes || null,
    });
  }

  const categories =
    kind === "receita"
      ? CATEGORIES_INCOME
      : scope === "empresa"
        ? [...CATEGORIES_BUSINESS, ...CATEGORIES_EXPENSE]
        : CATEGORIES_EXPENSE;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Nova movimentação"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40 grid size-14 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-elevated)] ring-4 ring-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 lg:bottom-8 lg:right-8"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="size-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>Registre uma receita ou despesa. Seus dados são privados e isolados por conta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => { setKind(v as "receita" | "despesa"); setCategory(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="despesa">Despesa</TabsTrigger>
              <TabsTrigger value="receita">Receita</TabsTrigger>
            </TabsList>
          </Tabs>

          {isMEI && (
            <div className="space-y-1.5">
              <Label>Este lançamento é</Label>
              <div className="inline-flex w-full rounded-lg border border-input bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => { setScope("pessoal"); setCategory(""); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${scope === "pessoal" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => { setScope("empresa"); setCategory(""); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${scope === "empresa" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  Empresa
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Data da movimentação</Label>
              <Input id="tx-date" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="method">Forma de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="method"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Data de vencimento</Label>
              <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-date">Data de {kind === "receita" ? "recebimento" : "pagamento"}</Label>
              <Input id="rec-date" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="installments-switch" className="text-sm">Parcelado</Label>
              <p className="text-xs text-muted-foreground">Divide o valor em parcelas mensais.</p>
            </div>
            <Switch id="installments-switch" checked={hasInstallments} onCheckedChange={setHasInstallments} />
          </div>
          {hasInstallments && (
            <div className="space-y-1.5">
              <Label htmlFor="num-inst">Número de parcelas</Label>
              <Input id="num-inst" type="number" min={2} max={120} value={installments} onChange={(e) => setInstallments(Number(e.target.value))} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar movimentação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TransactionMethodLike = "pix" | "dinheiro" | "debito" | "credito" | "boleto" | "transferencia" | "outro" | null;
