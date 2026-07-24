import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  full_name: string | null;
  business_mode: boolean;
  business_name: string | null;
}

async function fetchProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, business_mode, business_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

/** Lê o perfil do usuário logado. */
export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
}

/** Liga/desliga o modo empresa (MEI/autônomo) e grava o nome do negócio. */
export function useUpdateBusinessMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { business_mode: boolean; business_name?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");

      const { error } = await supabase
        .from("profiles")
        .update({
          business_mode: input.business_mode,
          business_name: input.business_name ?? null,
        })
        .eq("id", auth.user.id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
