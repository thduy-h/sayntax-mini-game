const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "ASR_MAX_UPLOAD_BYTES",
  "ASR_RATE_LIMIT_PER_MINUTE",
  "ASR_TIMEOUT_MS",
  "ADMIN_ALLOWLIST_EMAILS",
];

const errors = [];

for (const name of required) {
  if (!process.env[name]?.trim()) errors.push(`${name} is missing`);
}

if (process.env.ASR_MODE !== "cloud") {
  errors.push("ASR_MODE must be cloud");
}

if (process.env.GROQ_ASR_MODEL !== "whisper-large-v3-turbo") {
  errors.push("GROQ_ASR_MODEL must be whisper-large-v3-turbo");
}

for (const name of ["ASR_MAX_UPLOAD_BYTES", "ASR_RATE_LIMIT_PER_MINUTE", "ASR_TIMEOUT_MS"]) {
  const value = Number(process.env[name]);
  if (process.env[name] && (!Number.isInteger(value) || value <= 0)) {
    errors.push(`${name} must be a positive integer`);
  }
}

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.protocol !== "https:") errors.push("NEXT_PUBLIC_SUPABASE_URL must use HTTPS");
  }
} catch {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
}

if (errors.length > 0) {
  console.error("Staging configuration is not ready:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS staging configuration (values redacted)");
