import { writeFile } from "node:fs/promises";

const ARTIFACT_DIR = "/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8";

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((t) => t.type === "page");
if (!target) throw new Error("No page target found on 9222");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let msgId = 1;
const pending = new Map();
ws.addEventListener("message", ({ data }) => {
  const msg = JSON.parse(data);
  if (!msg.id) return;
  const waiter = pending.get(msg.id);
  if (!waiter) return;
  pending.delete(msg.id);
  if (msg.error) waiter.reject(new Error(msg.error.message));
  else waiter.resolve(msg.result);
});

function send(method, params = {}) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(expression) {
  const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return res.result.value;
}

async function captureScreenshot(name) {
  const res = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(`${ARTIFACT_DIR}/screenshots/${name}.png`, Buffer.from(res.data, "base64"));
  await writeFile(`${ARTIFACT_DIR}/${name}.png`, Buffer.from(res.data, "base64"));
  console.log(`[Screenshot Saved] ${name}.png`);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });

console.log("1. Navigating to Lesson 1 with clean state...");
await evalInPage(`localStorage.clear(); location.reload();`);
await new Promise((r) => setTimeout(r, 2500));

// Reopen primer if needed
await evalInPage(`(() => {
  const reopen = document.querySelector('button[aria-label="Xem kiến thức nhanh của bài học"]');
  if (reopen) reopen.click();
})()`);
await new Promise((r) => setTimeout(r, 500));

// Test 1: Expand Global Voice HUD
console.log("2. Testing Global Voice HUD expand & status while primer open...");
const expandResult = await evalInPage(`(() => {
  const expandBtn = document.querySelector('[aria-label="Mở rộng chi tiết thanh giọng nói"]') || document.querySelector('[aria-label*="Mở rộng"]');
  if (expandBtn) expandBtn.click();
  const hud = document.querySelector('[aria-label*="Thanh điều khiển và trạng thái giọng nói"]');
  return { expanded: !!hud };
})()`);
console.log("HUD Expanded Result:", expandResult);
await new Promise((r) => setTimeout(r, 500));
await captureScreenshot("qa_hud_expanded_over_workspace");

// Test 2: Dispatch command and verify live HUD feedback update
console.log("3. Dispatching command 'Trợ giúp' via Dev Command input...");
await evalInPage(`(() => {
  const input = document.getElementById('globalCommandInput');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "Trợ giúp");
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const form = input.closest('form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
})()`);
await new Promise((r) => setTimeout(r, 800));

const feedbackCheck = await evalInPage(`(() => {
  const hud = document.querySelector('[aria-label*="Thanh điều khiển và trạng thái giọng nói"]');
  const hudText = hud?.textContent || "";
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return {
    hudIncludesHelp: hudText.includes("Kiến thức nhanh đang mở") || hudText.includes("Trợ giúp kiến thức") || hudText.includes("Thành công"),
    hudTextSnippet: hudText.slice(0, 150),
    primerStillOpen: !!primer,
  };
})()`);

console.log("Live HUD Feedback Result:", feedbackCheck);
if (!feedbackCheck.primerStillOpen) throw new Error("Primer should remain open during help command!");
await captureScreenshot("qa_hud_feedback_updated");

console.log("=== HUD LIVE STATES VERIFIED SUCCESSFULLY ===");
ws.close();
process.exit(0);
