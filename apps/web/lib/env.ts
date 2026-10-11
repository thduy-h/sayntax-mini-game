import { z } from "zod";

const envSchema = z.object({
  ADMIN_EMAILS: z.string().optional(),
  ADMIN_ALLOWLIST_EMAILS: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv() {
  return envSchema.parse({
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_ALLOWLIST_EMAILS: process.env.ADMIN_ALLOWLIST_EMAILS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function getEnvSafe(): AppEnv | null {
  const parsed = envSchema.safeParse({
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_ALLOWLIST_EMAILS: process.env.ADMIN_ALLOWLIST_EMAILS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}

export function isSupabaseConfigured() {
  return getEnvSafe() !== null;
}

export function getSiteUrl() {
  const env = getEnvSafe();
  return env?.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function isAdminEmailAllowed(email: string) {
  const env = getEnvSafe();
  if (!env) return false;
  const allowlist = [
    env.ADMIN_EMAILS,
    env.ADMIN_ALLOWLIST_EMAILS,
  ].filter(Boolean).join(",")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return false;
  }

  return allowlist.includes(email.trim().toLowerCase());
}
