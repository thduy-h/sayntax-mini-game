if (process.env.DEPLOY_ENV_FILE) process.loadEnvFile(process.env.DEPLOY_ENV_FILE);

const target = process.argv[2] === "production" ? "production" : "staging";
const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "GROQ_ASR_MODEL",
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

for (const [name, minimum, maximum] of [
  ["ASR_MAX_UPLOAD_BYTES", 1, 100 * 1024 * 1024],
  ["ASR_RATE_LIMIT_PER_MINUTE", 1, 600],
  ["ASR_TIMEOUT_MS", 1_000, 60_000],
]) {
  const value = Number(process.env[name]);
  if (process.env[name] && (!Number.isInteger(value) || value < minimum || value > maximum)) {
    errors.push(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}

for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  if (!process.env[name]) continue;
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      errors.push(`${name} must be an HTTPS URL without credentials`);
    }
  } catch {
    errors.push(`${name} must be a valid HTTPS URL`);
  }
}

if (process.env.LOCAL_ASR_URL || process.env.LOCAL_ASR_TOKEN) {
  errors.push("Local ASR settings must be absent in cloud deployment");
}
for (const name of Object.keys(process.env)) {
  if (name.startsWith("NEXT_PUBLIC_") && /(SERVICE_ROLE|GROQ|LOCAL_ASR|ADMIN_EMAILS)/.test(name)) {
    errors.push(`${name} must not be public`);
  }
}

if (errors.length > 0) {
  console.error(`${target} configuration is not ready:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS ${target} configuration (values redacted)`);
