const START_FILLER_PHRASES = [
  "giup minh",
  "cho minh",
  "vui long",
  "lam on",
  "hay",
  "toi",
  "minh",
  "ban",
  "giup",
  "cai",
  "mot",
] as const;

const END_FILLER_WORDS = new Set(["nhe", "nha", "di", "voi", "a", "oi", "ban", "cai"]);

export interface NormalizedVietnameseTranscript {
  ascii: string;
  original: string;
  tokens: string[];
}

export function stripVietnameseDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

function normalizeBase(value: string) {
  return stripVietnameseDiacritics(value.normalize("NFC").trim().toLowerCase())
    .replace(/[.,!?;:"'()[\]{}]+/g, " ")
    .replace(/[^\p{L}\p{N}.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeVietnameseTranscript(value: string, options: { stripFillers?: boolean } = {}) {
  let ascii = normalizeBase(value);
  if (options.stripFillers !== false) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const phrase of START_FILLER_PHRASES) {
        if (ascii === phrase) {
          ascii = "";
          changed = true;
        } else if (ascii.startsWith(`${phrase} `)) {
          ascii = ascii.slice(phrase.length).trim();
          changed = true;
        }
      }
    }
    const tokens = ascii.split(/\s+/).filter(Boolean);
    while (tokens.length && END_FILLER_WORDS.has(tokens[tokens.length - 1]!)) tokens.pop();
    ascii = tokens.join(" ");
  }
  return {
    ascii,
    original: value.trim(),
    tokens: ascii.split(/\s+/).filter(Boolean),
  } satisfies NormalizedVietnameseTranscript;
}
