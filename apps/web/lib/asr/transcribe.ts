const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_RATE_LIMIT = 30;
const DEFAULT_TIMEOUT_MS = 20_000;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-flac",
  "audio/x-wav",
]);

type ASRMode = "cloud" | "local";
type Environment = Record<string, string | undefined>;

interface ASRConfig {
  groqApiKey?: string;
  groqModel: string;
  localToken?: string;
  localUrl: string;
  maxUploadBytes: number;
  mode: ASRMode;
  rateLimit: number;
  timeoutMs: number;
}

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateEntries = new Map<string, RateEntry>();

function readInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function readASRConfig(env: Environment = process.env): ASRConfig | null {
  if (env.ASR_MODE !== "cloud" && env.ASR_MODE !== "local") return null;
  return {
    groqApiKey: env.GROQ_API_KEY,
    groqModel: env.GROQ_ASR_MODEL?.trim() || "whisper-large-v3-turbo",
    localToken: env.LOCAL_ASR_TOKEN?.trim() || undefined,
    localUrl: (env.LOCAL_ASR_URL?.trim() || "http://127.0.0.1:8000").replace(/\/+$/, ""),
    maxUploadBytes: readInteger(env.ASR_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES, 1, 100 * 1024 * 1024),
    mode: env.ASR_MODE,
    rateLimit: readInteger(env.ASR_RATE_LIMIT_PER_MINUTE, DEFAULT_RATE_LIMIT, 1, 600),
    timeoutMs: readInteger(env.ASR_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 1_000, 60_000),
  };
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}

function clientKey(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

function exceedsRateLimit(request: Request, config: ASRConfig, now: number) {
  const key = clientKey(request);
  const existing = rateEntries.get(key);
  if (!existing || now >= existing.resetAt) {
    rateEntries.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  existing.count += 1;
  return existing.count > config.rateLimit;
}

export function resetASRRateLimitForTests() {
  rateEntries.clear();
}

function upstreamFailure(status: number) {
  if (status === 429) {
    return json({ error: "Dịch vụ nhận dạng đang bận.", fallback: true }, 429);
  }
  return json({ error: "Dịch vụ nhận dạng tạm thời không khả dụng.", fallback: true }, 503);
}

export async function handleASRTranscription(
  request: Request,
  options: { env?: Environment; fetch?: typeof fetch; now?: number } = {},
): Promise<Response> {
  const config = readASRConfig(options.env);
  if (!config) return json({ error: "ASR chưa được cấu hình.", fallback: true }, 503);
  if (config.mode === "cloud" && !config.groqApiKey) {
    return json({ error: "ASR cloud chưa được cấu hình.", fallback: true }, 503);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > config.maxUploadBytes + 64 * 1024) {
    return json({ error: "Tệp âm thanh quá lớn." }, 413);
  }
  if (exceedsRateLimit(request, config, options.now ?? Date.now())) {
    return json({ error: "Bạn đang gửi quá nhiều yêu cầu. Hãy thử lại sau.", fallback: true }, 429);
  }

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return json({ error: "Dữ liệu âm thanh không hợp lệ." }, 400);
  }
  const file = input.get("file");
  if (!(file instanceof Blob) || file.size === 0) return json({ error: "Thiếu tệp âm thanh." }, 400);
  if (file.size > config.maxUploadBytes) return json({ error: "Tệp âm thanh quá lớn." }, 413);
  const contentType = file.type.split(";", 1)[0]?.toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(contentType)) return json({ error: "Định dạng âm thanh không được hỗ trợ." }, 415);

  const upstreamBody = new FormData();
  upstreamBody.append("file", file, file instanceof File && file.name ? file.name : "speech.webm");
  const headers = new Headers();
  let upstreamUrl: string;
  if (config.mode === "cloud") {
    upstreamUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
    headers.set("Authorization", `Bearer ${config.groqApiKey}`);
    upstreamBody.append("model", config.groqModel);
    upstreamBody.append("language", "vi");
    upstreamBody.append("response_format", "json");
  } else {
    upstreamUrl = `${config.localUrl}/transcribe`;
    if (config.localToken) headers.set("Authorization", `Bearer ${config.localToken}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await (options.fetch ?? fetch)(upstreamUrl, {
      body: upstreamBody,
      headers,
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      return response.status === 429 || response.status >= 500
        ? upstreamFailure(response.status)
        : json({ error: "Dịch vụ nhận dạng từ chối tệp âm thanh." }, response.status);
    }
    const data = await response.json().catch(() => null) as { text?: unknown } | null;
    if (!data || typeof data.text !== "string") return upstreamFailure(502);
    return json({ text: data.text.trim(), provider: config.mode === "cloud" ? "groq" : "local" });
  } catch {
    return upstreamFailure(503);
  } finally {
    clearTimeout(timer);
  }
}
