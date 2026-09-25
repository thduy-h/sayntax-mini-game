import { performance } from "node:perf_hooks";

const baseUrl = process.env.LOAD_BASE_URL?.replace(/\/+$/, "");
if (!baseUrl) {
  console.error("Set LOAD_BASE_URL. This script never targets a default host.");
  process.exit(2);
}
const paths = (process.env.LOAD_PATHS || "/,/demo").split(",").map((value) => value.trim()).filter(Boolean);
if (paths.some((path) => !path.startsWith("/") || path.startsWith("/api/") || !["/", "/demo"].includes(path))) {
  console.error("LOAD_PATHS may contain only safe GET paths: / and /demo");
  process.exit(2);
}
const profiles = (process.env.LOAD_CONCURRENCY || "20,60,100").split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0 && value <= 100);
const requestsPerWorker = Math.max(1, Math.min(10, Number(process.env.LOAD_REQUESTS_PER_WORKER || 2)));

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

for (const concurrency of profiles) {
  const samples = [];
  const statuses = new Map();
  await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
    for (let index = 0; index < requestsPerWorker; index += 1) {
      const path = paths[(worker + index) % paths.length];
      const started = performance.now();
      let status = 0;
      try {
        const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
        status = response.status;
        await response.arrayBuffer();
      } catch {
        status = 0;
      }
      samples.push(performance.now() - started);
      statuses.set(status, (statuses.get(status) || 0) + 1);
    }
  }));
  samples.sort((a, b) => a - b);
  const total = samples.length;
  const successful = [...statuses.entries()].reduce((sum, [status, count]) => sum + (status >= 200 && status < 400 ? count : 0), 0);
  const count429 = statuses.get(429) || 0;
  const count5xx = [...statuses.entries()].reduce((sum, [status, count]) => sum + (status >= 500 ? count : 0), 0);
  console.log(JSON.stringify({ concurrency, requests: total, successRate: Number((successful / total * 100).toFixed(2)), p50Ms: Math.round(percentile(samples, 0.5)), p95Ms: Math.round(percentile(samples, 0.95)), status429: count429, status5xx: count5xx, statuses: Object.fromEntries([...statuses].sort()) }));
}
