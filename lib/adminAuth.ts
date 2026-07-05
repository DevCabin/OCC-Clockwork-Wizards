import { getSupabaseClient } from "./supabase";

const ADMIN_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password || typeof password !== "string") return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("password")
    .eq("id", ADMIN_SETTINGS_ID)
    .single();

  if (error || !data) return false;
  return data.password === password;
}

export function getAdminSettingsId(): string {
  return ADMIN_SETTINGS_ID;
}
