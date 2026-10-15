// Lightweight Chrome DevTools Protocol helper for local visual QA.
import { writeFile } from "node:fs/promises";

const [path = "/", width = "1366", height = "768", output = "/tmp/sayntax.png", expression = ""] = process.argv.slice(2);
const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No browser page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 1;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
await send("Emulation.setDeviceMetricsOverride", { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: Number(width) < 600 });
await send("Page.enable");
await send("Page.navigate", { url: `http://127.0.0.1:3000${path}` });
await new Promise((resolve) => setTimeout(resolve, 1800));
if (expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(result.result.value));
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const result = await send("Runtime.evaluate", { expression: "({title:document.title,url:location.href,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,text:document.body.innerText.slice(0,1200)})", returnByValue: true });
console.log(JSON.stringify(result.result.value));
const capture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(output, Buffer.from(capture.data, "base64"));
socket.close();
