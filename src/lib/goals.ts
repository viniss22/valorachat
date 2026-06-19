import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export type GoalRow = {
  id: string;
  title: string;
  target_cents: number;
  accumulated_cents: number;
  deadline: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export const goalInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  target: z.number().positive().max(99999999),
  deadline: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});
export type GoalInput = z.infer<typeof goalInputSchema>;

export async function listGoals(): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GoalRow[];
}

export async function createGoal(input: GoalInput) {
  const parsed = goalInputSchema.parse(input);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const { error } = await supabase.from("goals").insert({
    user_id: u.user.id,
    title: parsed.title,
    target_cents: Math.round(parsed.target * 100),
    deadline: parsed.deadline || null,
    color: parsed.color || null,
  });
  if (error) throw error;
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

export async function contributeGoal(goalId: string, amount: number, note?: string) {
  if (!(amount > 0)) throw new Error("Valor inválido");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const cents = Math.round(amount * 100);

  const { data: goal, error: gErr } = await supabase
    .from("goals").select("accumulated_cents,target_cents").eq("id", goalId).single();
  if (gErr) throw gErr;

  const newTotal = Math.min(goal.target_cents, goal.accumulated_cents + cents);

  const { error: cErr } = await supabase.from("goal_contributions").insert({
    goal_id: goalId, user_id: u.user.id, amount_cents: cents, note: note || null,
  });
  if (cErr) throw cErr;

  const { error: uErr } = await supabase.from("goals")
    .update({ accumulated_cents: newTotal })
    .eq("id", goalId);
  if (uErr) throw uErr;
}

/** Estima data de conclusão com base no ritmo médio dos aportes dos últimos 90 dias. */
export function estimateCompletion(g: GoalRow, monthlyAvgCents: number): string | null {
  if (g.accumulated_cents >= g.target_cents) return null;
  if (!monthlyAvgCents || monthlyAvgCents <= 0) return null;
  const missing = g.target_cents - g.accumulated_cents;
  const months = Math.ceil(missing / monthlyAvgCents);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}