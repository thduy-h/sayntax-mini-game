import { z } from "zod";

const envSchema = z.object({
  ADMIN_ALLOWLIST_EMAILS: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export function getEnv() {
  return envSchema.parse({
    ADMIN_ALLOWLIST_EMAILS: process.env.ADMIN_ALLOWLIST_EMAILS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function getSiteUrl() {
  const env = getEnv();
  return env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function isAdminEmailAllowed(email: string) {
  const env = getEnv();
  const allowlist = (env.ADMIN_ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return false;
  }

  return allowlist.includes(email.trim().toLowerCase());
}

