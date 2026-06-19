import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Cartão de débito" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

export const CATEGORIES_EXPENSE = [
  "Alimentação", "Moradia", "Transporte", "Lazer", "Saúde",
  "Educação", "Assinaturas", "Compras", "Outros",
];

export const CATEGORIES_INCOME = [
  "Salário", "Honorários", "Dividendos", "Aluguéis", "Vendas", "Outros",
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "oklch(0.68 0.15 160)",
  "Moradia": "oklch(0.52 0.13 235)",
  "Transporte": "oklch(0.78 0.15 75)",
  "Lazer": "oklch(0.7 0.17 152)",
  "Saúde": "oklch(0.58 0.22 14)",
  "Educação": "oklch(0.6 0.118 184.704)",
  "Assinaturas": "oklch(0.627 0.265 303.9)",
  "Compras": "oklch(0.769 0.188 70.08)",
  "Outros": "oklch(0.5 0.015 256)",
  "Salário": "oklch(0.68 0.15 160)",
  "Honorários": "oklch(0.52 0.13 235)",
  "Dividendos": "oklch(0.78 0.15 75)",
  "Aluguéis": "oklch(0.7 0.17 152)",
  "Vendas": "oklch(0.627 0.265 303.9)",
};

export const transactionInputSchema = z.object({
  kind: z.enum(["receita", "despesa"]),
  amount: z.number().positive("Valor deve ser maior que zero").max(99999999),
  category: z.string().trim().min(1, "Selecione uma categoria").max(60),
  description: z.string().trim().min(1, "Descreva a movimentação").max(200),
  transaction_date: z.string().min(1),
  due_date: z.string().optional().nullable(),
  received_date: z.string().optional().nullable(),
  payment_method: z.enum(["pix", "dinheiro", "debito", "credito", "boleto", "transferencia", "outro"]).optional().nullable(),
  installments_total: z.number().int().min(1).max(120).default(1),
  notes: z.string().max(500).optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export type TransactionRow = {
  id: string;
  kind: "receita" | "despesa";
  amount_cents: number;
  category: string;
  description: string;
  transaction_date: string;
  due_date: string | null;
  received_date: string | null;
  payment_method: string | null;
  installments_total: number;
  installment_number: number;
  notes: string | null;
  source: string;
  created_at: string;
};

export async function listTransactions(): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as TransactionRow[];
}

export async function createTransaction(input: TransactionInput) {
  const parsed = transactionInputSchema.parse(input);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

  const baseAmountCents = Math.round(parsed.amount * 100);
  const installments = parsed.installments_total ?? 1;

  // For installments, split equally and create N rows with sequential dates (monthly)
  const rows = Array.from({ length: installments }).map((_, i) => {
    const baseDate = new Date(parsed.transaction_date + "T12:00:00");
    baseDate.setMonth(baseDate.getMonth() + i);
    const txDate = baseDate.toISOString().slice(0, 10);
    return {
      user_id: userId,
      kind: parsed.kind,
      amount_cents: Math.round(baseAmountCents / installments),
      category: parsed.category,
      description: installments > 1 ? `${parsed.description} (${i + 1}/${installments})` : parsed.description,
      transaction_date: txDate,
      due_date: parsed.due_date || null,
      received_date: parsed.received_date || null,
      payment_method: parsed.payment_method || null,
      installments_total: installments,
      installment_number: i + 1,
      notes: parsed.notes || null,
      source: "manual",
    };
  });

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw error;

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "transaction.create",
    entity: "transaction",
    metadata: { kind: parsed.kind, installments, amount_cents: baseAmountCents },
    user_agent: navigator.userAgent.slice(0, 500),
  });
}

export async function deleteTransaction(id: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
  if (userId) {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "transaction.delete",
      entity: "transaction",
      entity_id: id,
      user_agent: navigator.userAgent.slice(0, 500),
    });
  }
}