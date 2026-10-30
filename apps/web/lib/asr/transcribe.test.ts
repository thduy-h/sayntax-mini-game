import assert from "node:assert/strict";
import { handleASRTranscription, readASRConfig, resetASRRateLimitForTests } from "./transcribe";
import { shouldFallbackToBrowser } from "../../features/voice-control/asr/hybrid-manager";
import { HybridASRManager } from "../../features/voice-control/asr/hybrid-manager";
import type { ASREngine, ASREngineCallbacks, ASREngineType } from "../../features/voice-control/asr/types";

const audio = new File(["audio"], "speech.webm", { type: "audio/webm" });

function request(file: Blob = audio) {
  const body = new FormData();
  body.append("file", file, "speech.webm");
  return new Request("http://localhost/api/asr/transcribe", { body, method: "POST" });
}

const base = {
  ASR_MAX_UPLOAD_BYTES: "1024",
  ASR_RATE_LIMIT_PER_MINUTE: "30",
  ASR_TIMEOUT_MS: "1000",
};

async function run() {
  resetASRRateLimitForTests();
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const cloud = await handleASRTranscription(request(), {
    env: { ...base, ASR_MODE: "cloud", GROQ_API_KEY: "private-groq-key", GROQ_ASR_MODEL: "whisper-large-v3-turbo" },
    fetch: async (url, init) => {
      calledUrl = String(url);
      calledInit = init;
      return Response.json({ text: " xin chào " });
    },
  });
  assert.equal(calledUrl, "https://api.groq.com/openai/v1/audio/transcriptions");
  assert.equal(new Headers(calledInit?.headers).get("authorization"), "Bearer private-groq-key");
  const cloudForm = calledInit?.body as FormData;
  assert.equal(cloudForm.get("model"), "whisper-large-v3-turbo");
  assert.equal(cloudForm.get("language"), "vi");
  assert.deepEqual(await cloud.json(), { text: "xin chào", provider: "groq" });

  resetASRRateLimitForTests();
  const explicitRequest = request();
  explicitRequest.headers.set("X-ASR-Provider", "groq");
  const explicit = await handleASRTranscription(explicitRequest, {
    env: { ...base, ASR_MODE: "local", GROQ_API_KEY: "private-groq-key" },
    fetch: async (url) => {
      assert.equal(String(url), "https://api.groq.com/openai/v1/audio/transcriptions");
      return Response.json({ text: "học thử" });
    },
  });
  assert.deepEqual(await explicit.json(), { text: "học thử", provider: "groq" });
  const missingKeyRequest = request();
  missingKeyRequest.headers.set("X-ASR-Provider", "groq");
  assert.equal((await handleASRTranscription(missingKeyRequest, { env: base })).status, 503);

  resetASRRateLimitForTests();
  const local = await handleASRTranscription(request(), {
    env: { ...base, ASR_MODE: "local", LOCAL_ASR_URL: "http://127.0.0.1:8000/", LOCAL_ASR_TOKEN: "local-secret" },
    fetch: async (url, init) => {
      assert.equal(String(url), "http://127.0.0.1:8000/transcribe");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer local-secret");
      return Response.json({ text: "thêm khối in" });
    },
  });
  assert.deepEqual(await local.json(), { text: "thêm khối in", provider: "local" });

  resetASRRateLimitForTests();
  const invalid = await handleASRTranscription(request(), { env: { ...base, ASR_MODE: "auto" } });
  assert.equal(invalid.status, 503);
  assert.equal((await invalid.json()).fallback, true);
  assert.equal(readASRConfig({ ASR_MODE: "browser" }), null);

  for (const status of [429, 500, 503]) {
    resetASRRateLimitForTests();
    const errors: string[] = [];
    const original = console.error;
    console.error = (...values: unknown[]) => errors.push(values.join(" "));
    try {
      const failed = await handleASRTranscription(request(), {
        env: { ...base, ASR_MODE: "cloud", GROQ_API_KEY: "private-groq-key" },
        fetch: async () => new Response("upstream secret", { status }),
      });
      assert.equal(failed.status, status === 429 ? 429 : 503);
      const serialized = JSON.stringify(await failed.json()) + errors.join("\n");
      assert.equal(serialized.includes("private-groq-key"), false);
      assert.equal(serialized.includes("upstream secret"), false);
    } finally {
      console.error = original;
    }
  }

  resetASRRateLimitForTests();
  const networkFailure = await handleASRTranscription(request(), {
    env: { ...base, ASR_MODE: "cloud", GROQ_API_KEY: "private-groq-key" },
    fetch: async () => { throw new TypeError("network failed"); },
  });
  assert.equal(networkFailure.status, 503);
  assert.equal((await networkFailure.json()).fallback, true);

  resetASRRateLimitForTests();
  const limitedEnv = { ...base, ASR_MODE: "local", ASR_RATE_LIMIT_PER_MINUTE: "1" };
  await handleASRTranscription(request(), { env: limitedEnv, fetch: async () => Response.json({ text: "ok" }) });
  const rateLimited = await handleASRTranscription(request(), { env: limitedEnv, fetch: async () => Response.json({ text: "ok" }) });
  assert.equal(rateLimited.status, 429);

  resetASRRateLimitForTests();
  const oversized = await handleASRTranscription(request(new Blob(["x".repeat(1025)], { type: "audio/webm" })), {
    env: { ...base, ASR_MODE: "local" },
  });
  assert.equal(oversized.status, 413);

  assert.equal(shouldFallbackToBrowser({ code: "upstream_unavailable", message: "", recoverable: true }), true);
  assert.equal(shouldFallbackToBrowser({ code: "permission_denied", message: "", recoverable: false }), false);
  assert.equal(shouldFallbackToBrowser({ code: "transcribe_failed", message: "", recoverable: true }), false);

  let serverCallbacks: ASREngineCallbacks | undefined;
  let browserStarts = 0;
  const fakeEngine = (type: ASREngineType, callbacks: ASREngineCallbacks, start?: () => void): ASREngine => ({
    type,
    dispose() {},
    isSupported: () => true,
    async start() { start?.(); callbacks.onStateChange?.("listening"); },
    async stop() {},
  });
  const manager = new HybridASRManager({
    callbacks: {},
    createBrowserEngine: (callbacks) => fakeEngine("browser", callbacks, () => { browserStarts += 1; }),
    createServerEngine: (callbacks) => {
      serverCallbacks = callbacks;
      return fakeEngine("server", callbacks);
    },
    selectedDeviceId: () => "",
  });
  await manager.initialize("server");
  serverCallbacks?.onError?.({ code: "upstream_unavailable", message: "", recoverable: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(browserStarts, 1);
  serverCallbacks?.onError?.({ code: "permission_denied", message: "", recoverable: false });
  assert.equal(browserStarts, 1);
  manager.dispose();
  console.log("ASR proxy/fallback tests passed");
}

void run();
