import type { AppRole } from "@shecancode/shared-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AppUserRecord {
  email: string;
  id: string;
  onboarding_completed: boolean;
  role: AppRole;
}

export async function getCurrentAppUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, onboarding_completed")
    .eq("id", user.id)
    .single<AppUserRecord>();

  if (error || !data) {
    return null;
  }

  return data;
}

export function getRedirectPathForUser(user: Pick<AppUserRecord, "onboarding_completed" | "role">) {
  if (!user.onboarding_completed) {
    return "/onboarding";
  }

  return user.role === "admin" ? "/admin" : "/dashboard";
}

