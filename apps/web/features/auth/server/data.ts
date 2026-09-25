import type { AppRole } from "@shecancode/shared-types";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/features/auth/roles";

export interface AppUserRecord {
  email: string;
  id: string;
  onboarding_completed: boolean;
  role: AppRole;
}

export async function getCurrentAppUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

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

export function isAdminUser(user: Pick<AppUserRecord, "role"> | null) {
  return hasAdminRole(user);
}
