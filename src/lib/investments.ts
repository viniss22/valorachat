import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const INVESTMENT_TYPES = [
  { value: "tesouro", label: "Tesouro Direto" },
  { value: "cdb", label: "CDB / LCI / LCA" },
  { value: "acoes", label: "Ações" },
  { value: "fii", label: "Fundos Imobiliários" },
  { value: "etf", label: "ETF" },
  { value: "cripto", label: "Criptomoedas" },
  { value: "outro", label: "Outro" },
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number]["value"];

export const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  tesouro: "oklch(0.52 0.13 235)",
  cdb: "oklch(0.6 0.14 210)",
  acoes: "oklch(0.68 0.15 160)",
  fii: "oklch(0.7 0.17 152)",
  etf: "oklch(0.78 0.15 75)",
  cripto: "oklch(0.75 0.18 55)",
  outro: "oklch(0.5 0.015 256)",
};

export const investmentInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do ativo").max(120),
  type: z.enum(["tesouro", "cdb", "acoes", "fii", "etf", "cripto", "outro"]),
  invested: z.number().nonnegative("Valor inválido").max(99999999),
  current: z.number().nonnegative("Valor inválido").max(99999999),
  institution: z.string().trim().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type InvestmentInput = z.infer<typeof investmentInputSchema>;

export type InvestmentRow = {
  id: string;
  name: string;
  type: InvestmentType;
  invested_cents: number;
  current_cents: number;
  institution: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const investmentUpdateSchema = investmentInputSchema.partial().extend({
  id: z.string().uuid(),
});
export type InvestmentUpdate = z.infer<typeof investmentUpdateSchema>;

export async function listInvestments(): Promise<InvestmentRow[]> {
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .order("current_cents", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as InvestmentRow[];
}

export async function createInvestment(input: InvestmentInput) {
  const parsed = investmentInputSchema.parse(input);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

  const row = {
    user_id: userId,
    name: parsed.name,
    type: parsed.type,
    invested_cents: Math.round(parsed.invested * 100),
    current_cents: Math.round(parsed.current * 100),
    institution: parsed.institution || null,
    notes: parsed.notes || null,
  };

  const { error } = await supabase.from("investments").insert(row);
  if (error) throw error;

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "investment.create",
    entity: "investment",
    metadata: { type: parsed.type, invested_cents: row.invested_cents },
    user_agent: navigator.userAgent.slice(0, 500),
  });
}

export async function updateInvestment(input: InvestmentUpdate) {
  const parsed = investmentUpdateSchema.parse(input);
  const { id, invested, current, ...rest } = parsed;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const patch: Record<string, unknown> = { ...rest };
  if (typeof invested === "number") patch.invested_cents = Math.round(invested * 100);
  if (typeof current === "number") patch.current_cents = Math.round(current * 100);

  const { error } = await supabase.from("investments").update(patch as never).eq("id", id);
  if (error) throw error;

  if (userId) {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "investment.update",
      entity: "investment",
      entity_id: id,
      metadata: patch as Record<string, never>,
      user_agent: navigator.userAgent.slice(0, 500),
    });
  }
}

export async function deleteInvestment(id: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw error;
  if (userId) {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "investment.delete",
      entity: "investment",
      entity_id: id,
      user_agent: navigator.userAgent.slice(0, 500),
    });
  }
}

export function investmentReturnPct(row: Pick<InvestmentRow, "invested_cents" | "current_cents">) {
  if (row.invested_cents === 0) return 0;
  return ((row.current_cents - row.invested_cents) / row.invested_cents) * 100;
}

export function investmentTypeLabel(type: string) {
  return INVESTMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}