export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export function allowedOrigin(request: Request): string {
  const configured = Deno.env.get("ARENA_ALLOWED_ORIGIN");
  if (!configured) throw new Error("server_origin_not_configured");
  const origin = request.headers.get("origin");
  if (origin && origin !== configured) throw new Error("origin_forbidden");
  return configured;
}
export function corsHeaders(request: Request) { return { "access-control-allow-origin": allowedOrigin(request), "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-mc-token, x-team-token", "access-control-allow-methods": "POST, OPTIONS", "vary": "Origin" }; }
export async function body(request: Request): Promise<Record<string, unknown>> { const value = await request.json().catch(() => ({})); return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
export function requireString(value: unknown, field: string, max = 200): string { if (typeof value !== "string" || value.length === 0 || value.length > max) throw new Error(`invalid_${field}`); return value; }
export function clientAddress(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "unknown"; }
