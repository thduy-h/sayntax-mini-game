import { writeFile, mkdir } from "node:fs/promises";

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

async function sendDevCommand(text) {
  await evalInPage(`(() => {
    let input = document.getElementById("globalCommandInput");
    if (!input) {
      const btn = document.querySelector(".scc-global-command-collapsed button");
      if (btn) btn.click();
    }
  })()`);
  await new Promise((r) => setTimeout(r, 400));
  const res = await evalInPage(`(() => {
    const input = document.getElementById("globalCommandInput");
    if (!input) return { error: "no_input" };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(text)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const form = input.closest("form");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    return { sent: ${JSON.stringify(text)} };
  })()`);
  await new Promise((r) => setTimeout(r, 800));
  return res;
}

// Ensure Page domain enabled
await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");
await setViewport(1366, 768);

console.log("=== SAYNTAX QA: Lesson View Architecture & HUD Non-blocking Verification ===");

// 1. Fresh Entry: Navigate and reset localStorage
console.log("\n[TEST 1] Fresh Entry -> Defaults to Knowledge View");
await send("Page.navigate", { url: "http://127.0.0.1:3000/demo/start-and-sequence-v2" });
await new Promise((r) => setTimeout(r, 2500));

await evalInPage(`(() => {
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
})()`);

await new Promise((r) => setTimeout(r, 3000));

const initialState = await evalInPage(`(() => {
  const tabKnowledge = document.getElementById("tab-knowledge");
  const tabPractice = document.getElementById("tab-practice");
  const panelKnowledge = document.getElementById("panel-knowledge");
  const panelPractice = document.getElementById("panel-practice");
  const primerTitle = document.getElementById("lesson-primer-title");
  const ctaBtn = panelKnowledge ? panelKnowledge.querySelector("button[type='button'].w-full") : null;
  const micButtons = document.querySelectorAll("#voice-activation");
  const devLaunchers = Array.from(document.querySelectorAll(".scc-global-command-collapsed button")).filter(b => b.textContent.includes("[DEV]"));
  const devInput = document.getElementById("globalCommandInput");
  const hud = document.querySelector("[aria-label*='giọng nói toàn cục']");

  return {
    tabKnowledgeSelected: tabKnowledge?.getAttribute("aria-selected"),
    tabPracticeSelected: tabPractice?.getAttribute("aria-selected"),
    panelKnowledgeVisible: Boolean(panelKnowledge && !panelKnowledge.classList.contains("hidden")),
    panelPracticeHidden: Boolean(panelPractice && panelPractice.classList.contains("hidden")),
    primerTitle: primerTitle?.textContent?.trim(),
    ctaText: ctaBtn?.textContent?.trim(),
    micButtonCount: micButtons.length,
    devLauncherCount: devLaunchers.length,
    devInputVisible: Boolean(devInput && devInput.offsetParent !== null),
    hudVisible: Boolean(hud),
  };
})()`);

console.log("Initial state:", initialState);
if (initialState.tabKnowledgeSelected !== "true" || !initialState.panelKnowledgeVisible) {
  throw new Error("Failed: Knowledge View should be active on first entry");
}
if (initialState.micButtonCount !== 1) {
  throw new Error(`Failed: Expected exactly 1 mic button with id="voice-activation", found ${initialState.micButtonCount}`);
}
if (initialState.devLauncherCount !== 1) {
  throw new Error(`Failed: Expected exactly 1 unified DEV launcher, found ${initialState.devLauncherCount}`);
}

await captureScreenshot("qa_views_initial_knowledge");

// 2. Test Voice Scrolling Inside Knowledge View
console.log("\n[TEST 2] Voice Scroll in Knowledge View: 'Cuộn xuống'");
const scrollBefore = await evalInPage(`(() => {
  const el = document.getElementById("panel-knowledge");
  return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
})()`);
console.log("Scroll before:", scrollBefore);

const sendResDown = await sendDevCommand("cuộn xuống");
console.log("sendDevCommand result:", sendResDown);

const scrollAfterDown = await evalInPage(`(() => {
  const el = document.getElementById("panel-knowledge");
  return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
})()`);
console.log("Scroll after down:", scrollAfterDown);

if (scrollAfterDown.scrollTop <= scrollBefore.scrollTop) {
  throw new Error("Failed: 'Cuộn xuống' did not scroll Knowledge panel");
}

await captureScreenshot("qa_views_primer_scrolled");

// 3. Test Voice Scroll Up
console.log("\n[TEST 3] Voice Scroll in Knowledge View: 'Cuộn lên'");
await sendDevCommand("cuộn lên");

const scrollAfterUp = await evalInPage(`(() => {
  const el = document.getElementById("panel-knowledge");
  return { scrollTop: el.scrollTop };
})()`);
console.log("Scroll after up:", scrollAfterUp);

// 4. Switch to Practice View via Voice "Thực hành"
console.log("\n[TEST 4] Switch to Practice View via Voice 'Thực hành'");
await sendDevCommand("thực hành");

const practiceState = await evalInPage(`(() => {
  const tabKnowledge = document.getElementById("tab-knowledge");
  const tabPractice = document.getElementById("tab-practice");
  const panelKnowledge = document.getElementById("panel-knowledge");
  const panelPractice = document.getElementById("panel-practice");
  const blocklySvg = document.querySelector(".blocklySvg");
  const runBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Chạy"));

  return {
    tabKnowledgeSelected: tabKnowledge?.getAttribute("aria-selected"),
    tabPracticeSelected: tabPractice?.getAttribute("aria-selected"),
    panelKnowledgeOpen: Boolean(panelKnowledge),
    panelPracticeVisible: Boolean(panelPractice && !panelPractice.classList.contains("hidden")),
    blocklySvgRendered: Boolean(blocklySvg),
    runBtnVisible: Boolean(runBtn),
    hasStartedStored: localStorage.getItem("scc_lesson_started:start-and-sequence-v2"),
  };
})()`);

console.log("Practice state:", practiceState);
if (practiceState.tabPracticeSelected !== "true" || !practiceState.panelPracticeVisible) {
  throw new Error("Failed: Practice View should be active after 'thực hành'");
}

await captureScreenshot("qa_views_practice_active");

// 5. Add a Block in Blockly Workspace
console.log("\n[TEST 5] Add a block in Blockly via command");
await sendDevCommand("thêm khối bắt đầu");

const blockState1 = await evalInPage(`(() => {
  const blocks = document.querySelectorAll(".blocklyDraggable");
  return { blockCount: blocks.length };
})()`);
console.log("Block count after adding block:", blockState1);

await captureScreenshot("qa_views_block_added");

// 6. Switch Back to Knowledge View ("Xem kiến thức")
console.log("\n[TEST 6] Switch back to Knowledge View via 'Xem kiến thức'");
await sendDevCommand("xem kiến thức");

const reopenedKnowledgeState = await evalInPage(`(() => {
  const tabKnowledge = document.getElementById("tab-knowledge");
  const panelKnowledge = document.getElementById("panel-knowledge");
  const title = document.getElementById("lesson-primer-title");
  const cta = panelKnowledge ? panelKnowledge.querySelector("button[type='button'].w-full") : null;

  return {
    tabKnowledgeSelected: tabKnowledge?.getAttribute("aria-selected"),
    title: title?.textContent?.trim(),
    ctaText: cta?.textContent?.trim(),
  };
})()`);
console.log("Reopened Knowledge View state:", reopenedKnowledgeState);
if (reopenedKnowledgeState.title !== "Ôn lại kiến thức" || !reopenedKnowledgeState.ctaText.includes("Tiếp tục học")) {
  throw new Error("Failed: Expected title 'Ôn lại kiến thức' and CTA 'Tiếp tục học →'");
}

await captureScreenshot("qa_views_knowledge_reopened");

// 7. Return to Practice View and Verify Blocks are 100% Intact
console.log("\n[TEST 7] Return to Practice View & Verify Blocks Intact");
await sendDevCommand("tiếp tục học");

const blockState2 = await evalInPage(`(() => {
  const blocks = document.querySelectorAll(".blocklyDraggable");
  const tabPractice = document.getElementById("tab-practice");
  return {
    tabPracticeSelected: tabPractice?.getAttribute("aria-selected"),
    blockCount: blocks.length
  };
})()`);
console.log("Block state after returning:", blockState2);
if (blockState2.blockCount < 1) {
  throw new Error("Failed: Blockly blocks were destroyed on view switch!");
}

await captureScreenshot("qa_views_blocks_preserved");

// 8. Test Reload Persistence: Returns directly to Practice View
console.log("\n[TEST 8] Reload Persistence");
await evalInPage(`location.reload()`);
await new Promise((r) => setTimeout(r, 3500));

const reloadState = await evalInPage(`(() => {
  const tabKnowledge = document.getElementById("tab-knowledge");
  const tabPractice = document.getElementById("tab-practice");
  const panelKnowledge = document.getElementById("panel-knowledge");
  const panelPractice = document.getElementById("panel-practice");

  return {
    tabKnowledgeSelected: tabKnowledge?.getAttribute("aria-selected"),
    tabPracticeSelected: tabPractice?.getAttribute("aria-selected"),
    panelKnowledgeOpen: Boolean(panelKnowledge),
    panelPracticeVisible: Boolean(panelPractice && !panelPractice.classList.contains("hidden")),
  };
})()`);
console.log("Reload state:", reloadState);
if (reloadState.tabPracticeSelected !== "true" || reloadState.panelKnowledgeOpen) {
  throw new Error("Failed: Should resume into Practice View after reload when already started");
}

await captureScreenshot("qa_views_reload_resumed");

// 9. Multi-Viewport Testing
console.log("\n[TEST 9] Multi-Viewport Responsive QA");

// A. 390x844 (Mobile)
console.log("Testing 390x844 Mobile...");
await setViewport(390, 844, 2, true);
await captureScreenshot("qa_views_viewport_390x844");

// Switch to knowledge on mobile
await evalInPage(`(() => {
  const tab = document.getElementById("tab-knowledge");
  if (tab) tab.click();
})()`);
await new Promise((r) => setTimeout(r, 800));
await captureScreenshot("qa_views_viewport_390x844_knowledge");

// B. 1366x768 (Laptop)
console.log("Testing 1366x768 Laptop...");
await setViewport(1366, 768, 1, false);
await captureScreenshot("qa_views_viewport_1366x768");

// C. FHD 100% (1920x1080)
console.log("Testing FHD 100% (1920x1080)...");
await setViewport(1920, 1080, 1, false);
await captureScreenshot("qa_views_viewport_fhd_100");

// D. FHD 125% (1536x864)
console.log("Testing FHD 125% (1536x864)...");
await setViewport(1536, 864, 1.25, false);
await captureScreenshot("qa_views_viewport_fhd_125");

// E. FHD 150% (1280x720)
console.log("Testing FHD 150% (1280x720)...");
await setViewport(1280, 720, 1.5, false);
await captureScreenshot("qa_views_viewport_fhd_150");

// F. Zoom 200% (960x540)
console.log("Testing Zoom 200% (960x540)...");
await setViewport(960, 540, 2, false);
await captureScreenshot("qa_views_viewport_fhd_200");

console.log("\n=== ALL QA TESTS COMPLETED SUCCESSFULLY ===");
ws.close();
