const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/+$/, "");
if (!baseUrl) {
  console.error("Set SMOKE_BASE_URL, for example: SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke");
  process.exit(2);
}

const authCookie = process.env.SMOKE_AUTH_COOKIE;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);
const results = [];

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (authCookie) headers.set("cookie", authCookie);
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
}

async function check(name, run) {
  try {
    await run();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expectStatus(response, statuses) {
  if (!statuses.includes(response.status)) throw new Error(`expected ${statuses.join("/")}, got ${response.status}`);
}

const demoLessonPaths = [
  "/demo/start-and-sequence-v2",
  "/demo/print-output-v2",
  "/demo/repeat-loops-v2",
  "/demo/if-basics-v2",
  "/demo/variables-basics-v2",
];

for (const path of ["/", "/demo", ...demoLessonPaths]) {
  await check(`public ${path}`, async () => expectStatus(await request(path), [200]));
}

if (!authCookie) {
  for (const path of ["/dashboard", "/lessons-v2/start-and-sequence-v2", "/admin"]) {
    await check(`protected ${path}`, async () => {
      const response = await request(path);
      expectStatus(response, [302, 303, 307, 308]);
      if (!response.headers.get("location")?.includes("/sign-in")) throw new Error("missing sign-in redirect");
    });
  }
  const validIds = { lessonId: "40000000-0000-0000-0000-000000000001", lessonStepId: "40000000-0000-0000-0000-000000000101" };
  for (const [path, payload] of [
    ["/api/progress", { ...validIds, status: "completed" }],
    ["/api/programs", { ...validIds, workspaceState: { version: 1, blocks: [] } }],
    ["/api/program-runs", { ...validIds, workspaceState: { version: 1, blocks: [] }, executionResult: { errors: [], output: [], success: true, variables: {} } }],
    ["/api/voice-command-logs", { ...validIds, transcript: "smoke", normalizedTranscript: "smoke", parsedAction: { type: "unknown" }, status: "unsupported" }],
  ]) {
    await check(`unauthenticated ${path}`, async () => {
      const response = await request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      expectStatus(response, [401]);
    });
  }
} else {
  await check("authenticated dashboard", async () => expectStatus(await request("/dashboard"), [200]));
  await check("authenticated lesson", async () => expectStatus(await request("/lessons-v2/start-and-sequence-v2"), [200]));
  if (process.env.SMOKE_EXPECT_ROLE === "student") {
    await check("student denied admin", async () => {
      const response = await request("/admin");
      expectStatus(response, [200]);
      if (!(await response.text()).includes("không có quyền truy cập")) throw new Error("admin denial message missing");
    });
  }
  await check("fake lesson/step rejected", async () => {
    const response = await request("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId: "00000000-0000-0000-0000-000000000001", lessonStepId: "00000000-0000-0000-0000-000000000002", status: "completed" }),
    });
    expectStatus(response, [400]);
  });
}

await check("ASR malformed upload rejected", async () => {
  const response = await request("/api/asr/transcribe", { method: "POST", body: new FormData() });
  expectStatus(response, [400]);
});

if (process.env.SMOKE_SKIP_OVERSIZED !== "1") {
  const limit = Number(process.env.SMOKE_ASR_MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
  await check("ASR oversized upload rejected", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(limit + 1)], { type: "audio/webm" }), "oversized.webm");
    expectStatus(await request("/api/asr/transcribe", { method: "POST", body: form }), [413]);
  });
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\nSmoke: ${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
