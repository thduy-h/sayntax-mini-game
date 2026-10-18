import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const ARTIFACT_DIR = "/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8";
await mkdir(`${ARTIFACT_DIR}/screenshots`, { recursive: true });

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

let curWidth = 1366;
let curHeight = 768;

async function captureScreenshot(name) {
  const res = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: curWidth, height: curHeight, scale: 1 },
  });
  const path = `${ARTIFACT_DIR}/screenshots/${name}.png`;
  await writeFile(path, Buffer.from(res.data, "base64"));
  // Also save to root artifact dir for easy user access
  await writeFile(`${ARTIFACT_DIR}/${name}.png`, Buffer.from(res.data, "base64"));
  console.log(`[Screenshot Saved] ${name}.png`);
  return path;
}

async function setViewport(width, height, dsf = 1, mobile = false) {
  curWidth = width;
  curHeight = height;
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dsf,
    mobile,
  });
  await new Promise((r) => setTimeout(r, 400));
}

async function sendCommand(text) {
  return await evalInPage(`(() => {
    const input = document.getElementById('globalCommandInput');
    if (!input) return { error: "no_input" };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(text)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const form = input.closest('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { sent: ${JSON.stringify(text)} };
  })()`);
}

await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");

console.log("=== Starting Knowledge Primer Non-Blocking Overlay QA ===");

// 1. Initial State on Desktop 1366x768
await setViewport(1366, 768, 1, false);
console.log("1. Navigating to Lesson 1 demo...");
await send("Page.navigate", { url: "http://127.0.0.1:3000/demo/start-and-sequence-v2" });
await new Promise((r) => setTimeout(r, 2000));

// Clear storage for fresh test
console.log("2. Resetting localStorage for fresh learner profile...");
await evalInPage(`(() => {
  localStorage.clear();
  location.reload();
})()`);
await new Promise((r) => setTimeout(r, 2500));

// Check fresh state
const freshCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const title = document.getElementById('lesson-primer-title')?.textContent?.trim();
  const ctaBtn = primer?.querySelector('button[type="button"].w-full')?.textContent?.trim();
  const hasBlockingOverlay = !!document.querySelector('.fixed.inset-0.bg-black\\\\/60');
  const bodyOverflow = document.body.style.overflow;
  const voiceHud = document.querySelector('[aria-label*="Thanh điều khiển và trạng thái giọng nói"]');
  const devBar = document.querySelector('.scc-global-command-bar, .scc-global-command-collapsed') || document.getElementById('globalCommandInput');
  const closeBtn = document.querySelector('button[aria-label="Đóng kiến thức nhanh"]');

  const hudRect = voiceHud?.getBoundingClientRect();
  const primerRect = primer?.getBoundingClientRect();

  return {
    isOpen: !!primer,
    title,
    ctaBtn,
    hasBlockingOverlay,
    bodyOverflow,
    hudVisible: !!voiceHud && (hudRect ? hudRect.width > 0 && hudRect.height > 0 : false),
    hasCloseBtn: !!closeBtn,
    hudPosition: hudRect ? { top: hudRect.top, left: hudRect.left, width: hudRect.width, height: hudRect.height } : null,
    primerScrollTop: primer?.scrollTop ?? -1,
    primerScrollHeight: primer?.scrollHeight ?? -1,
    primerClientHeight: primer?.clientHeight ?? -1,
  };
})()`);

console.log("Fresh Profile Verification:", freshCheck);

if (!freshCheck.isOpen) throw new Error("Primer should be open on fresh profile!");
if (freshCheck.hasBlockingOverlay) throw new Error("CRITICAL: Full-screen blocking modal overlay (bg-black/60) should NOT exist!");
if (!freshCheck.hudVisible) throw new Error("Global Voice HUD must be visible and unobstructed while primer is open!");
if (freshCheck.title !== "Trước khi bắt đầu") throw new Error("Title should be 'Trước khi bắt đầu'!");
if (freshCheck.ctaBtn !== "Bắt đầu bài học →") throw new Error("CTA button should be 'Bắt đầu bài học →'!");

await captureScreenshot("qa_initial_fresh_1366x768");

// 2. Test "Cuộn xuống" via text command (hands-free developer & learner parity)
console.log("3. Testing 'Cuộn xuống' command...");
await sendCommand("Cuộn xuống");
await new Promise((r) => setTimeout(r, 800));

const scrollDownCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const lastFeedback = document.querySelector('.scc-voice-debug-panel, [aria-label*="Thanh điều khiển"]')?.textContent;
  const globalHudText = document.querySelector('[aria-label*="Thanh điều khiển và trạng thái giọng nói"]')?.textContent;
  return {
    scrollTop: primer?.scrollTop,
    scrollHeight: primer?.scrollHeight,
    clientHeight: primer?.clientHeight,
    globalHudText: globalHudText?.slice(0, 100),
  };
})()`);

console.log("Scroll Down Result:", scrollDownCheck);
if (scrollDownCheck.scrollTop <= 0) throw new Error("Primer failed to scroll down on 'Cuộn xuống'!");

await captureScreenshot("qa_scrolled_down");

// 3. Test "Cuộn lên"
console.log("4. Testing 'Cuộn lên' command...");
await sendCommand("Cuộn lên");
await new Promise((r) => setTimeout(r, 800));

const scrollUpCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return { scrollTop: primer?.scrollTop };
})()`);
console.log("Scroll Up Result:", scrollUpCheck);

// 4. Test "Bắt đầu bài học" command
console.log("5. Testing 'Bắt đầu bài học' command...");
await sendCommand("Bắt đầu bài học");
await new Promise((r) => setTimeout(r, 1200));

const startedCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const blocklySvg = document.querySelector('.blocklySvg');
  const storedStarted = localStorage.getItem('scc_lesson_started:start-and-sequence-v2');
  const reopenBtn = document.querySelector('button[aria-label="Xem kiến thức nhanh của bài học"]');
  return {
    primerClosed: !primer,
    blocklyVisible: !!blocklySvg && blocklySvg.getBoundingClientRect().width > 0,
    storedStarted,
    reopenBtnText: reopenBtn?.textContent?.trim(),
  };
})()`);

console.log("Lesson Started Result:", startedCheck);
if (!startedCheck.primerClosed) throw new Error("Primer should close when 'Bắt đầu bài học' is issued!");
if (!startedCheck.blocklyVisible) throw new Error("Blockly workspace should be visible and active!");
if (startedCheck.storedStarted !== "1") throw new Error("Lesson started state not stored in localStorage!");
if (startedCheck.reopenBtnText !== "💡 Ôn lại kiến thức") throw new Error("Button should change to '💡 Ôn lại kiến thức'!");

await captureScreenshot("qa_workspace_active");

// 5. Test "Xem kiến thức" command
console.log("6. Testing 'Xem kiến thức' command...");
await sendCommand("Xem kiến thức");
await new Promise((r) => setTimeout(r, 800));

const reopenCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const title = document.getElementById('lesson-primer-title')?.textContent?.trim();
  const ctaBtn = primer?.querySelector('button[type="button"].w-full')?.textContent?.trim();
  const blocklySvg = document.querySelector('.blocklySvg');
  const hasBlockingOverlay = !!document.querySelector('.fixed.inset-0.bg-black\\\\/60');
  return {
    isOpen: !hasBlockingOverlay && !!primer,
    title,
    ctaBtn,
    blocklySvgStillInDom: !!blocklySvg,
  };
})()`);

console.log("Reopened Primer Result:", reopenCheck);
if (!reopenCheck.isOpen) throw new Error("Primer should reopen cleanly in-place!");
if (reopenCheck.title !== "Ôn lại kiến thức") throw new Error("Title on reopen should be 'Ôn lại kiến thức'!");
if (reopenCheck.ctaBtn !== "Tiếp tục học →") throw new Error("CTA button on reopen should be 'Tiếp tục học →'!");

await captureScreenshot("qa_primer_reopened");

// 6. Test "Tiếp tục học" command
console.log("7. Testing 'Tiếp tục học' command...");
await sendCommand("Tiếp tục học");
await new Promise((r) => setTimeout(r, 800));

const continueCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const blocklySvg = document.querySelector('.blocklySvg');
  return {
    primerClosed: !primer,
    blocklyVisible: !!blocklySvg && blocklySvg.getBoundingClientRect().width > 0,
  };
})()`);

console.log("Continue Result:", continueCheck);
if (!continueCheck.primerClosed || !continueCheck.blocklyVisible) throw new Error("Primer should close and return to workspace on 'Tiếp tục học'!");

// 7. Test "Đóng kiến thức" command
console.log("8. Testing 'Đóng kiến thức' command...");
await sendCommand("Xem kiến thức");
await new Promise((r) => setTimeout(r, 600));
await sendCommand("Đóng kiến thức");
await new Promise((r) => setTimeout(r, 800));

const closeCheck = await evalInPage(`(() => {
  return { primerClosed: !document.querySelector('[aria-labelledby="lesson-primer-title"]') };
})()`);
if (!closeCheck.primerClosed) throw new Error("'Đóng kiến thức' failed to close primer!");

// 8. Multi-Viewport & Zoom QA
console.log("9. Multi-viewport and Zoom QA...");

// 8a. Mobile 390x844
console.log("   - Testing Mobile 390x844...");
await setViewport(390, 844, 2, true);
await sendCommand("Xem kiến thức");
await new Promise((r) => setTimeout(r, 800));

const mobileCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const hud = document.querySelector('[aria-label*="Thanh điều khiển và trạng thái giọng nói"]');
  const primerRect = primer?.getBoundingClientRect();
  const hudRect = hud?.getBoundingClientRect();
  return {
    primerVisible: !!primer && primerRect.height > 200,
    hudVisible: !!hud && hudRect.height > 0,
    hudRect,
  };
})()`);
console.log("   Mobile Check:", mobileCheck);
if (!mobileCheck.primerVisible || !mobileCheck.hudVisible) throw new Error("Mobile 390x844 failed primer or HUD check!");
await captureScreenshot("qa_viewport_390x844");

// 8b. Laptop 1366x768
console.log("   - Testing Laptop 1366x768...");
await setViewport(1366, 768, 1, false);
await captureScreenshot("qa_viewport_1366x768");

// 8c. FHD Zoom 100% (1920x1080, dsf 1.0)
console.log("   - Testing FHD 100%...");
await setViewport(1920, 1080, 1.0, false);
await captureScreenshot("qa_viewport_fhd_100");

// 8d. FHD Zoom 125% (dsf 1.25)
console.log("   - Testing FHD 125%...");
await setViewport(1920, 1080, 1.25, false);
await captureScreenshot("qa_viewport_fhd_125");

// 8e. FHD Zoom 150% (dsf 1.5)
console.log("   - Testing FHD 150%...");
await setViewport(1920, 1080, 1.5, false);
await captureScreenshot("qa_viewport_fhd_150");

// 8f. FHD Zoom 200% (dsf 2.0)
console.log("   - Testing FHD 200%...");
await setViewport(1920, 1080, 2.0, false);
await captureScreenshot("qa_viewport_fhd_200");

// 9. Reload persistence check
console.log("10. Testing Reload Persistence...");
await setViewport(1366, 768, 1, false);
await sendCommand("Tiếp tục học");
await new Promise((r) => setTimeout(r, 600));

await evalInPage(`location.reload()`);
await new Promise((r) => setTimeout(r, 2500));

const reloadCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const blocklySvg = document.querySelector('.blocklySvg');
  return {
    primerOpen: !!primer,
    blocklyActive: !!blocklySvg && blocklySvg.getBoundingClientRect().width > 0,
    hasStarted: localStorage.getItem('scc_lesson_started:start-and-sequence-v2') === '1',
  };
})()`);

console.log("Reload Verification:", reloadCheck);
if (reloadCheck.primerOpen) throw new Error("Primer should NOT re-appear automatically on reload after lesson was started!");
if (!reloadCheck.blocklyActive) throw new Error("Blockly should be active after reload!");
await captureScreenshot("qa_reload_resumed");

console.log("=== ALL BROWSER QA CHECKS PASSED SUCCESSFULLY ===");
ws.close();
process.exit(0);
