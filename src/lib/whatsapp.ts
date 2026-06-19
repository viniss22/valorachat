import { supabase } from "@/integrations/supabase/client";

export type WhatsappStatus = "nao_conectado" | "pendente" | "conectado";

export type WhatsappProfile = {
  whatsapp_number: string | null;
  whatsapp_status: WhatsappStatus;
  whatsapp_verified_at: string | null;
  whatsapp_last_sync_at: string | null;
};

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizePhoneBR(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `+${withCountry}`;
}

export function formatPhoneBR(e164: string | null): string {
  if (!e164) return "—";
  const m = e164.replace("+55", "").replace(/\D/g, "");
  if (m.length === 11) return `+55 (${m.slice(0, 2)}) ${m.slice(2, 7)}-${m.slice(7)}`;
  if (m.length === 10) return `+55 (${m.slice(0, 2)}) ${m.slice(2, 6)}-${m.slice(6)}`;
  return e164;
}

export async function getWhatsappProfile(): Promise<WhatsappProfile> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const { data, error } = await supabase
    .from("profiles")
    .select("whatsapp_number,whatsapp_status,whatsapp_verified_at,whatsapp_last_sync_at")
    .eq("id", u.user.id)
    .single();
  if (error) throw error;
  return data as WhatsappProfile;
}

/** Gera código OTP de 6 dígitos e grava o hash. Em modo demonstração, retorna o código pra exibir na UI. */
export async function requestVerification(phone: string): Promise<{ code: string }> {
  const e164 = normalizePhoneBR(phone);
  if (!e164) throw new Error("Número inválido. Use o formato (11) 99999-9999.");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await sha256Hex(`${e164}:${code}`);
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalida códigos anteriores não consumidos
  await supabase.from("whatsapp_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", u.user.id).is("consumed_at", null);

  const { error } = await supabase.from("whatsapp_verifications").insert({
    user_id: u.user.id, phone_e164: e164, code_hash: hash, expires_at: expires,
  });
  if (error) throw error;

  await supabase.from("profiles").update({
    whatsapp_number: e164,
    whatsapp_status: "pendente",
  }).eq("id", u.user.id);

  await supabase.from("audit_logs").insert({
    user_id: u.user.id, action: "whatsapp.code_requested", entity: "whatsapp",
    metadata: { phone: e164 },
  });

  return { code };
}

export async function confirmVerification(phone: string, code: string) {
  const e164 = normalizePhoneBR(phone);
  if (!e164) throw new Error("Número inválido");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");

  const hash = await sha256Hex(`${e164}:${code.trim()}`);
  const { data: rows, error } = await supabase.from("whatsapp_verifications")
    .select("id,expires_at,consumed_at,attempts,code_hash")
    .eq("user_id", u.user.id).eq("phone_e164", e164)
    .order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  const v = rows?.[0];
  if (!v) throw new Error("Solicite um novo código.");
  if (v.consumed_at) throw new Error("Código já utilizado.");
  if (new Date(v.expires_at) < new Date()) throw new Error("Código expirado.");
  if (v.code_hash !== hash) {
    await supabase.from("whatsapp_verifications")
      .update({ attempts: (v.attempts ?? 0) + 1 }).eq("id", v.id);
    throw new Error("Código incorreto.");
  }

  const now = new Date().toISOString();
  await supabase.from("whatsapp_verifications")
    .update({ consumed_at: now }).eq("id", v.id);
  await supabase.from("profiles").update({
    whatsapp_status: "conectado",
    whatsapp_verified_at: now,
    whatsapp_last_sync_at: now,
  }).eq("id", u.user.id);

  await supabase.from("audit_logs").insert({
    user_id: u.user.id, action: "whatsapp.verified", entity: "whatsapp",
    metadata: { phone: e164 },
  });
}

export async function disconnectWhatsapp() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  await supabase.from("profiles").update({
    whatsapp_status: "nao_conectado",
    whatsapp_verified_at: null,
    whatsapp_number: null,
  }).eq("id", u.user.id);
  await supabase.from("audit_logs").insert({
    user_id: u.user.id, action: "whatsapp.disconnected", entity: "whatsapp",
  });
}

export async function syncWhatsapp() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const now = new Date().toISOString();
  await supabase.from("profiles")
    .update({ whatsapp_last_sync_at: now })
    .eq("id", u.user.id);
}

export type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function listAuditLogs(limit = 50): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,action,entity,entity_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}