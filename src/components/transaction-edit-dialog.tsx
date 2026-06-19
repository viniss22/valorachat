import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIES_EXPENSE, CATEGORIES_INCOME, PAYMENT_METHODS,
  updateTransaction, type TransactionRow,
} from "@/lib/transactions";

export function TransactionEditDialog({
  tx, open, onOpenChange,
}: { tx: TransactionRow | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [txDate, setTxDate] = useState("");
  const [method, setMethod] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!tx) return;
    setAmount((tx.amount_cents / 100).toFixed(2).replace(".", ","));
    setDescription(tx.description);
    setCategory(tx.category);
    setTxDate(tx.transaction_date);
    setMethod(tx.payment_method ?? "");
    setNotes(tx.notes ?? "");
  }, [tx]);

  const mutation = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      toast.success("Lançamento atualizado");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tx) return null;
  const categories = tx.kind === "receita" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return toast.error("Valor inválido");
    mutation.mutate({
      id: tx!.id,
      amount: v,
      description, category,
      transaction_date: txDate,
      payment_method: (method || null) as never,
      notes: notes || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {tx.kind}</DialogTitle>
          <DialogDescription>Alterações ficam registradas na auditoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-amount">Valor (R$)</Label>
              <Input id="ed-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-cat">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="ed-cat"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-desc">Descrição</Label>
            <Input id="ed-desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-date">Data</Label>
              <Input id="ed-date" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-met">Forma</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="ed-met"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-notes">Observações</Label>
            <Textarea id="ed-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}