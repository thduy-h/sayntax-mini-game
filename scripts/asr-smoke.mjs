import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const mode = process.env.ASR_MODE;
const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
if (mode === "local") {
  const localUrl = (process.env.LOCAL_ASR_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const response = await fetch(`${localUrl}/health`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok || (await response.json()).status !== "ok") throw new Error(`Local ASR health failed: ${response.status}`);
  console.log("PASS local FastAPI health");
}
if (mode === "cloud" && !process.env.GROQ_API_KEY) {
  console.log("SKIP Groq live test: GROQ_API_KEY is not set. Mock integration remains covered by npm test.");
  process.exit(0);
}
const audioPath = process.env.ASR_AUDIO_FILE;
if (!audioPath) {
  console.log("Set ASR_AUDIO_FILE to a short Vietnamese WAV/WebM/Ogg file to test transcription through Next.js.");
  process.exit(0);
}
const mime = { ".wav": "audio/wav", ".webm": "audio/webm", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".m4a": "audio/mp4" }[extname(audioPath).toLowerCase()];
if (!mime) throw new Error("ASR_AUDIO_FILE must be WAV, WebM, Ogg, MP3 or M4A");
const form = new FormData();
form.append("file", new Blob([await readFile(audioPath)], { type: mime }), `smoke${extname(audioPath)}`);
const response = await fetch(`${baseUrl}/api/asr/transcribe`, { method: "POST", body: form, signal: AbortSignal.timeout(30000) });
const result = await response.json();
if (!response.ok || typeof result.text !== "string" || !result.text.trim()) throw new Error(`ASR smoke failed with status ${response.status}`);
console.log(`PASS ASR provider=${result.provider} transcriptLength=${result.text.trim().length}`);
