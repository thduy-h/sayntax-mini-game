import assert from "node:assert/strict";
import { operationRecord, observeRoute } from "./logger";
import { onboardingSchema } from "../../features/onboarding/schemas";

const secret = "DO-NOT-SERIALIZE";
const record = operationRecord("auth_failure", {
  phase: "session", status: 401,
  ...Object.fromEntries(["password", "token", "cookie", "session", "rawAudio", "disabilitySupportNotes", "displayName", "error", "nested"].map(key => [key, { value: secret }])),
});
assert.equal(JSON.stringify(record).includes(secret), false);
assert.equal(record.status, 401);
const valid = { displayName: "Nguyen", fontScale: "default" };
assert.equal(onboardingSchema.safeParse(valid).success, true);
for (const [key, limit] of Object.entries({ displayName: 100, schoolName: 200, goals: 1000, disabilitySupportNotes: 2000, ageRange: 40, gradeLevel: 80 })) {
  assert.equal(onboardingSchema.safeParse({ ...valid, [key]: "x".repeat(limit) }).success, true);
  assert.equal(onboardingSchema.safeParse({ ...valid, [key]: "x".repeat(limit + 1) }).success, false, key);
}
async function verifyRoutes() {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message: string) => messages.push(message);
  try {
    const request = new Request("https://example.test/api/progress");
    const response = await observeRoute("progress_write_failure", async () => { throw new Error(secret); })(request);
    assert.equal(response.status, 500);
    assert.equal(messages.join().includes(secret), false);
    assert.equal(JSON.parse(messages[0]).event, "progress_write_failure");
    await observeRoute("voice_log_failure", async () => new Response(null, { status: 401 }))(request);
    assert.equal(JSON.parse(messages[1]).event, "auth_failure");
  } finally { console.error = original; }
}
void verifyRoutes().then(() => console.log("Operations/privacy tests passed"));
