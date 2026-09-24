function normalizeForASRFilter(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMMON_WHISPER_HALLUCINATIONS = [
  "hay subscribe",
  "dang ky kenh",
  "ghiền mì gõ",
  "ghien mi go",
  "de khong bo lo",
  "nhung video hap dan",
  "cam on cac ban da theo doi",
  "hen gap lai",
] as const;

export function isLikelyLocalASRHallucination(text: string) {
  const normalized = normalizeForASRFilter(text);
  if (!normalized) return true;
  return COMMON_WHISPER_HALLUCINATIONS.some((phrase) => normalized.includes(normalizeForASRFilter(phrase)));
}
