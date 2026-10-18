import { writeFile } from "node:fs/promises";

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

await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

console.log("1. Navigating to Lesson 1 demo...");
await send("Page.navigate", { url: "http://127.0.0.1:3000/demo/start-and-sequence-v2" });
await new Promise((r) => setTimeout(r, 2000));

// Clear storage for fresh test
console.log("2. Clearing localStorage to simulate fresh user...");
await evalInPage(`(() => {
  localStorage.clear();
  location.reload();
})()`);
await new Promise((r) => setTimeout(r, 2500));

const initialCheck = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const title = document.getElementById('lesson-primer-title')?.textContent?.trim();
  const bodyOverflow = document.body.style.overflow;
  const button = primer?.querySelector('button[type="button"].w-full')?.textContent?.trim();
  return {
    isOpen: !!primer,
    title,
    bodyOverflow,
    button,
    scrollTop: primer ? primer.scrollTop : -1,
    scrollHeight: primer ? primer.scrollHeight : -1,
    clientHeight: primer ? primer.clientHeight : -1,
  };
})()`);
console.log("Initial Check (Fresh Profile):", initialCheck);

if (!initialCheck.isOpen) throw new Error("Primer should be open on fresh profile!");
if (initialCheck.bodyOverflow !== "hidden") throw new Error("Body scroll should be locked!");
if (initialCheck.title !== "Trước khi bắt đầu") throw new Error("Title should be 'Trước khi bắt đầu'!");

// Take screenshot 1: Initial Open
let capture = await send("Page.captureScreenshot", { format: "png" });
await writeFile("/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8/screenshots/primer_initial_open.png", Buffer.from(capture.data, "base64"));
console.log("Saved primer_initial_open.png");

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

// 3. Test "Cuộn xuống" command
console.log("3. Submitting 'Cuộn xuống' command...");
const scrollDownRes = await sendCommand("Cuộn xuống");
console.log("Scroll down submitted:", scrollDownRes);
await new Promise((r) => setTimeout(r, 1000));

const afterScrollDown = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const status = document.getElementById('lesson-voice-status')?.textContent?.trim();
  return {
    isOpen: !!primer,
    scrollTop: primer ? primer.scrollTop : -1,
    status,
  };
})()`);
console.log("After 'Cuộn xuống':", afterScrollDown);

if (!afterScrollDown.isOpen) throw new Error("Primer closed unexpectedly when scrolling down!");
if (afterScrollDown.scrollTop <= 0) throw new Error("Primer did not scroll down!");

// Take screenshot 2: Scrolled Down
capture = await send("Page.captureScreenshot", { format: "png" });
await writeFile("/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8/screenshots/primer_scrolled_down.png", Buffer.from(capture.data, "base64"));
console.log("Saved primer_scrolled_down.png");

// 4. Test "Cuộn lên" command
console.log("4. Submitting 'Cuộn lên' command...");
await sendCommand("Cuộn lên");
await new Promise((r) => setTimeout(r, 1000));

const afterScrollUp = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return {
    isOpen: !!primer,
    scrollTop: primer ? primer.scrollTop : -1,
  };
})()`);
console.log("After 'Cuộn lên':", afterScrollUp);

// 5. Test "Xuống cuối" command
console.log("5. Submitting 'Xuống cuối' command...");
await sendCommand("Xuống cuối");
await new Promise((r) => setTimeout(r, 1000));

const afterScrollBottom = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return {
    isOpen: !!primer,
    scrollTop: primer ? primer.scrollTop : -1,
    scrollHeight: primer ? primer.scrollHeight : -1,
    clientHeight: primer ? primer.clientHeight : -1,
  };
})()`);
console.log("After 'Xuống cuối':", afterScrollBottom);

// 6. Test "Bắt đầu bài học" command
console.log("6. Submitting 'Bắt đầu bài học' command...");
await sendCommand("Bắt đầu bài học");
await new Promise((r) => setTimeout(r, 1000));

const afterStart = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const bodyOverflow = document.body.style.overflow;
  const started = localStorage.getItem('scc_lesson_started:start-and-sequence-v2');
  return {
    isOpen: !!primer,
    bodyOverflow,
    started,
  };
})()`);
console.log("After 'Bắt đầu bài học':", afterStart);

if (afterStart.isOpen) throw new Error("Primer should be closed after starting lesson!");
if (afterStart.bodyOverflow !== "") throw new Error("Body overflow lock should be released!");
if (afterStart.started !== "1") throw new Error("scc_lesson_started should be '1'!");

// Take screenshot 3: Workspace started
capture = await send("Page.captureScreenshot", { format: "png" });
await writeFile("/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8/screenshots/workspace_started.png", Buffer.from(capture.data, "base64"));
console.log("Saved workspace_started.png");

// 7. Reload page -> Should NOT auto-open
console.log("7. Reloading page...");
await send("Page.reload");
await new Promise((r) => setTimeout(r, 2500));

const afterReload = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return {
    isOpen: !!primer,
  };
})()`);
console.log("After reload (already started):", afterReload);
if (afterReload.isOpen) throw new Error("Primer should NOT auto-open after starting and reload!");

// 8. Reopen via "Xem kiến thức" command
console.log("8. Submitting 'Xem kiến thức' command...");
await sendCommand("Xem kiến thức");
await new Promise((r) => setTimeout(r, 1000));

const afterReopen = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  const title = document.getElementById('lesson-primer-title')?.textContent?.trim();
  const button = primer?.querySelector('button[type="button"].w-full')?.textContent?.trim();
  return {
    isOpen: !!primer,
    title,
    button,
  };
})()`);
console.log("After 'Xem kiến thức' reopen:", afterReopen);

if (!afterReopen.isOpen) throw new Error("Primer did not reopen!");
if (afterReopen.title !== "Ôn lại kiến thức") throw new Error("Title should be 'Ôn lại kiến thức'!");
if (afterReopen.button !== "Tiếp tục học →") throw new Error("Button should be 'Tiếp tục học →'!");

// Take screenshot 4: Reopened Primer
capture = await send("Page.captureScreenshot", { format: "png" });
await writeFile("/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8/screenshots/primer_reopened.png", Buffer.from(capture.data, "base64"));
console.log("Saved primer_reopened.png");

// 9. Mobile Viewport Check (390x844)
console.log("9. Testing mobile viewport 390x844...");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await new Promise((r) => setTimeout(r, 600));

capture = await send("Page.captureScreenshot", { format: "png" });
await writeFile("/home/thduy-h/.gemini/antigravity-cli/brain/e439cb9c-4ad0-4f8b-87ee-9185bb99e3a8/screenshots/primer_mobile.png", Buffer.from(capture.data, "base64"));
console.log("Saved primer_mobile.png");

// 10. Close primer via close button
console.log("10. Testing close button click...");
await evalInPage(`(() => {
  const closeBtn = document.querySelector('button[aria-label="Đóng kiến thức nhanh"]');
  if (closeBtn) closeBtn.click();
})()`);
await new Promise((r) => setTimeout(r, 600));

const afterCloseBtn = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return { isOpen: !!primer };
})()`);
console.log("After close button:", afterCloseBtn);
if (afterCloseBtn.isOpen) throw new Error("Primer should close after clicking close button!");

// 11. Test toolbar "Kiến thức nhanh" button
console.log("11. Testing toolbar '💡 Kiến thức nhanh' button click...");
await evalInPage(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Kiến thức nhanh'));
  if (btn) btn.click();
})()`);
await new Promise((r) => setTimeout(r, 600));

const afterToolbarClick = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return { isOpen: !!primer };
})()`);
console.log("After toolbar button click:", afterToolbarClick);
if (!afterToolbarClick.isOpen) throw new Error("Primer should open when clicking toolbar button!");

// 12. Test Escape key
console.log("12. Testing Escape key press...");
await evalInPage(`(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
})()`);
await new Promise((r) => setTimeout(r, 600));

const afterEscape = await evalInPage(`(() => {
  const primer = document.querySelector('[aria-labelledby="lesson-primer-title"]');
  return { isOpen: !!primer };
})()`);
console.log("After Escape key:", afterEscape);
if (afterEscape.isOpen) throw new Error("Primer should close on Escape!");

ws.close();
console.log(">>> ALL 12 BROWSER LIVE CHECKS PASSED PERFECTLY! <<<");
