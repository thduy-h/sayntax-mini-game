import type { BlockKind } from "@shecancode/shared-types";

// Optional position hint carried on `add_block` intents.
// Default (no position) means: append after the current/active block — see
// rule in CLAUDE.md product docs. `inside` means: the user said "vào trong"
// and explicitly asked for the new block to be placed inside a container.
export type AddBlockPosition =
  | { kind: "after_current" }
  | { kind: "inside"; parentHint: BlockKind };

export type VoiceIntent =
  | { kind: "add_block"; blockType: BlockKind; position?: AddBlockPosition }
  | { kind: "insert_into"; parentHint?: BlockKind; childHint?: BlockKind }
  | { kind: "set_text"; text: string }
  | { kind: "set_number"; value: number }
  | { kind: "delete_last" }
  | { kind: "run_program" }
  | { kind: "ask_hint" }
  | {
      kind: "unknown";
      reason: "empty" | "no_match" | "ambiguous" | "partial_add_block";
    };

type UnknownReason = "empty" | "no_match" | "ambiguous" | "partial_add_block";

const INSERT_PREFIXES = [
  "cho vao ben trong",
  "dat vao trong",
  "bo vao trong",
  "bo vo",
  "keo vo",
  "dat vao",
  "long vao",
  "nhet vao",
] as const;

// Connectors that indicate an inside-container placement when they follow
// an add_block phrase. Ordered longest-first so prefix matching prefers the
// most specific phrase.
const INSIDE_CONNECTORS = [
  "vao ben trong",
  "vao trong",
  "ben trong",
  "trong",
] as const;

const ADD_BLOCK_PHRASES: ReadonlyArray<readonly [BlockKind, readonly string[]]> = [
  ["start", ["them khoi bat dau", "them lenh bat dau", "cho khoi bat dau", "keo khoi bat dau ra", "them start", "khoi bat dau"]],
  ["print", ["them khoi in", "cho khoi in", "them lenh in", "them in", "khoi in", "in ra"]],
  ["repeat", ["them khoi lap", "cho khoi lap", "them vong lap", "them lap", "khoi lap", "lap lai"]],
  ["if", ["them khoi dieu kien", "them khoi neu", "them dieu kien", "khoi dieu kien", "them if", "neu thi"]],
  ["variable", ["them khoi bien", "them mot bien", "them bien", "tao bien", "bien moi", "khoi bien"]],
] as const;

const BLOCK_HINTS: ReadonlyArray<readonly [string, BlockKind]> = [
  ["dieu kien", "if"],
  ["bat dau", "start"],
  ["lap", "repeat"],
  ["bien", "variable"],
  ["neu", "if"],
  ["in", "print"],
] as const;

const RUN_PROGRAM_PHRASES = [
  "chay chuong trinh",
  "bat dau chay",
  "run program",
  "chay code",
  "thuc thi",
  "chay thu",
  "chay di",
  "chay",
] as const;

const DELETE_LAST_PHRASES = [
  "xoa khoi vua them",
  "xoa khoi cuoi cung",
  "xoa khoi cuoi",
  "xoa lenh cuoi",
  "bo khoi cuoi",
  "bo khoi vua them",
  "xoa khoi nay",
  "huy khoi cuoi",
  "go khoi cuoi",
] as const;

const ASK_HINT_PHRASES = [
  "cho xin goi y",
  "toi can goi y",
  "xin goi y",
  "huong dan",
  "chi toi",
  "mach nho",
  "giup voi",
  "giup",
  "goi y",
  "meo",
] as const;

const DIGIT_WORDS: Record<string, number> = {
  khong: 0,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
};

function stripVietnameseDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

function normalizeTranscript(transcript: string): string {
  return stripVietnameseDiacritics(transcript.trim().toLowerCase())
    .replace(/^[.,!?;:"'()]+|[.,!?;:"'()]+$/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(hay|lam on|giup minh|cho minh)\s+/, "")
    .replace(/\s+(di|nhe|nha|a|voi|oi)$/g, "")
    .trim();
}

function unknown(reason: UnknownReason): VoiceIntent {
  return { kind: "unknown", reason };
}

function parseVietnameseNumber(value: string): number | null {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return DIGIT_WORDS[tokens[0]] ?? null;
  if (tokens[0] === "muoi") {
    if (tokens.length === 2) {
      const unit = tokens[1] === "lam" || tokens[1] === "nam" ? 5 : DIGIT_WORDS[tokens[1]];
      return unit === undefined ? null : 10 + unit;
    }
    return null;
  }
  if (tokens.length >= 2 && tokens[1] === "muoi") {
    const tens = DIGIT_WORDS[tokens[0]];
    if (tens === undefined || tens < 2 || tens > 9) return null;
    if (tokens.length === 2) return tens * 10;
    if (tokens.length === 3) {
      const unitToken = tokens[2];
      const unit =
        unitToken === "lam" || unitToken === "nam"
          ? 5
          : unitToken === "tu"
            ? 4
            : DIGIT_WORDS[unitToken];
      return unit === undefined ? null : tens * 10 + unit;
    }
  }
  return null;
}

function matchPhrasePrefix(input: string, phrases: readonly string[]): string | undefined {
  let best: string | undefined;
  for (const phrase of phrases) {
    if (input === phrase || input.startsWith(`${phrase} `)) {
      if (best === undefined || phrase.length > best.length) best = phrase;
    }
  }
  return best;
}

function findParentHint(remaining: string): BlockKind | undefined {
  for (const [hint, kind] of BLOCK_HINTS) {
    if (remaining === hint || remaining.startsWith(`${hint} `) || remaining.endsWith(` ${hint}`) || remaining.includes(` ${hint} `)) {
      return kind;
    }
  }
  return undefined;
}

export function parseVoiceIntent(transcript: string): VoiceIntent {
  const original = transcript.trim();
  if (!original) return unknown("empty");

  const normalized = normalizeTranscript(original);
  if (!normalized) return unknown("empty");

  const originalTokens = original.split(/\s+/);
  const normalizedTokens = normalized.split(/\s+/);

  const textMatch = normalized.match(
    /^(?:sua noi dung thanh|doi noi dung thanh|sua chu thanh|doi chu thanh|dat chu|go chu|noi dung la|cho chu|viet chu|chu la)\s+(.+)$/,
  );
  if (textMatch) {
    const payloadTokens = textMatch[1].split(/\s+/).filter(Boolean).length;
    const prefixLength = normalizedTokens.length - payloadTokens;
    // Strip surrounding sentence-ending punctuation from the captured text.
    // Web Speech API often appends "." or "!" to dictated phrases, which
    // would otherwise mismatch later expectedOutput comparisons.
    const text = originalTokens.slice(prefixLength).join(" ").trim().replace(/^[.,!?;:"'()]+|[.,!?;:"'()]+$/g, "").trim();
    return text ? { kind: "set_text", text } : unknown("no_match");
  }

  const numberMatch = normalized.match(
    /^(?:sua so lan thanh|doi so lan thanh|doi so thanh|sua so thanh|dat so|gia tri(?: la)?|cho so|dat bang|so la|gan bang)\s+(.+)$/,
  );
  if (numberMatch) {
    const payload = numberMatch[1].trim();
    if (/^\d+$/.test(payload)) return { kind: "set_number", value: Number(payload) };
    const parsed = parseVietnameseNumber(payload);
    return parsed === null ? unknown("no_match") : { kind: "set_number", value: parsed };
  }

  const insertPrefix = matchPhrasePrefix(normalized, INSERT_PREFIXES);
  if (insertPrefix) {
    const remaining = normalized.slice(insertPrefix.length).trim();
    return {
      kind: "insert_into",
      parentHint: remaining ? findParentHint(remaining) : undefined,
      childHint: undefined,
    };
  }

  let matchedBlock: { phrase: string; blockType: BlockKind } | undefined;
  for (const [blockType, phrases] of ADD_BLOCK_PHRASES) {
    const phrase = matchPhrasePrefix(normalized, phrases);
    if (phrase && (matchedBlock === undefined || phrase.length > matchedBlock.phrase.length)) {
      matchedBlock = { phrase, blockType };
    }
  }
  if (matchedBlock) {
    // Product rule: "thêm khối X" defaults to appending AFTER the current
    // block. Only when the learner explicitly says "vào trong Y" do we
    // attach a position hint pointing inside a container. See product docs.
    const remaining = normalized.slice(matchedBlock.phrase.length).trim();
    if (remaining) {
      const connector = matchPhrasePrefix(remaining, INSIDE_CONNECTORS);
      if (connector) {
        const afterConnector = remaining.slice(connector.length).trim();
        const parentHint = afterConnector ? findParentHint(afterConnector) : undefined;
        if (parentHint) {
          return {
            kind: "add_block",
            blockType: matchedBlock.blockType,
            position: { kind: "inside", parentHint },
          };
        }
      }
    }
    return { kind: "add_block", blockType: matchedBlock.blockType };
  }

  // delete_last comes before the partial_add_block guard because some delete
  // phrases (e.g. "bo khoi vua them") include the word "them" and would
  // otherwise get captured as an incomplete add_block.
  if (matchPhrasePrefix(normalized, DELETE_LAST_PHRASES)) return { kind: "delete_last" };

  if (/\b(them|cho|keo)\b/.test(normalized)) return unknown("partial_add_block");

  if (matchPhrasePrefix(normalized, RUN_PROGRAM_PHRASES)) return { kind: "run_program" };

  if (matchPhrasePrefix(normalized, ASK_HINT_PHRASES)) return { kind: "ask_hint" };

  return unknown("no_match");
}
