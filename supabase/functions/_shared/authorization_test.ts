import { assertEquals } from "jsr:@std/assert@1";
import { tokenIsValid } from "./authorization.ts";
const now = new Date("2026-01-01T00:00:00Z");
Deno.test("token authorization rejects invalid, expired, and revoked tokens", () => { assertEquals(tokenIsValid({ hash:"good", expiresAt:"2026-01-02T00:00:00Z" },"good",now),true); assertEquals(tokenIsValid({ hash:"good", expiresAt:"2026-01-02T00:00:00Z" },"wrong",now),false); assertEquals(tokenIsValid({ hash:"good", expiresAt:"2025-12-31T00:00:00Z" },"good",now),false); assertEquals(tokenIsValid({ hash:"good", expiresAt:"2026-01-02T00:00:00Z", revokedAt:"2025-12-30T00:00:00Z" },"good",now),false); });
