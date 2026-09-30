import assert from "node:assert/strict";

import { HybridASRManager } from "./hybrid-manager";
import type { ASREngine, ASREngineCallbacks, ASREngineType, ASRError, ASRState } from "./types";

class FakeEngine implements ASREngine {
  starts = 0;

  constructor(
    readonly type: ASREngineType,
    private readonly callbacks: ASREngineCallbacks,
    private readonly supported = true,
  ) {}

  dispose() {}
  isSupported() { return this.supported; }
  async start() {
    this.starts += 1;
    this.callbacks.onStateChange?.("starting");
    this.callbacks.onStateChange?.("listening");
  }
  async stop() { this.callbacks.onStateChange?.("stopped"); }
  fail(error: ASRError) { this.callbacks.onError?.(error); }
}

async function run() {
  const states: ASRState[] = [];
  const engines: ASREngineType[] = [];
  const errors: ASRError[] = [];
  let browser!: FakeEngine;
  let server!: FakeEngine;
  const manager = new HybridASRManager({
    callbacks: {
      onEngineChange: (engine) => engines.push(engine),
      onError: (error) => errors.push(error),
      onStateChange: (state) => states.push(state),
    },
    createBrowserEngine: (callbacks) => (browser = new FakeEngine("browser", callbacks)),
    createServerEngine: (callbacks) => (server = new FakeEngine("server", callbacks)),
    selectedDeviceId: () => "",
  });

  await manager.initialize();
  server.fail({ code: "upstream_unavailable", message: "Máy chủ tạm thời không phản hồi.", recoverable: true });
  await Promise.resolve();
  assert.equal(browser.starts, 1);
  assert.equal(errors.length, 0);
  assert.equal(engines.at(-1), "browser");
  assert.equal(states.at(-1), "listening");

  browser.fail({ code: "network", message: "Browser Speech thất bại.", recoverable: true });
  assert.equal(errors.at(-1)?.message, "Browser Speech thất bại.");

  server.fail({ code: "permission_denied", message: "Micro bị chặn.", recoverable: false });
  assert.equal(errors.at(-1)?.code, "permission_denied");
  assert.equal(browser.starts, 1);

  console.log("hybrid ASR manager tests passed");
}

void run();
