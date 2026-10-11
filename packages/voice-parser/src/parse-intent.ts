import type { BlockKind } from "@shecancode/shared-types";
import { stripVietnameseDiacritics } from "./transcript-normalizer";

// Optional position hint carried on `add_block` intents.
// Default (no position) means: append after the current/active block — see
// rule in CLAUDE.md product docs. `inside` means: the user said "vào trong"
// and explicitly asked for the new block to be placed inside a container.
export type AddBlockPosition =
  | { kind: "after_current" }
  | { kind: "inside"; parentHint: BlockKind };

export type VoiceIntent =
  | {
      kind: "add_block";
      blockType: BlockKind;
      position?: AddBlockPosition;
      fields?: {
        text?: string;
        times?: number;
        name?: string;
        variableName?: string;
        value?: string | number;
      };
    }
  | { kind: "insert_into"; parentHint?: BlockKind; childHint?: BlockKind }
  | { kind: "select_block"; target: "display_id" | "last" | "main" | "block_type"; displayId?: string; blockType?: BlockKind; ordinal?: number }
  | {
      kind: "set_insert_cursor";
      position: "before" | "after" | "inside" | "end";
      target?: "selected" | "display_id" | "last" | "main";
      displayId?: string;
    }
  | { kind: "query_position" }
  | { kind: "set_text"; text: string }
  | { kind: "set_number"; value: number }
  | { kind: "set_variable_output"; name: string }
  | { kind: "delete_block"; target: "selected" | "display_id" | "last"; displayId?: string }
  | { kind: "delete_last" }
  | {
      kind: "move_block";
      target: "selected" | "display_id";
      direction: "up" | "down" | "inside" | "outside";
      displayId?: string;
      parentDisplayId?: string;
    }
  | { kind: "run_program" }
  | { kind: "navigate_step"; target: "previous" | "next" | "number"; stepNumber?: number }
  | { kind: "ask_hint" }
  | { kind: "check_work" }
  | { kind: "explain_block" }
  | { kind: "confirm" }
  | { kind: "cancel" }
  | { kind: "undo_last" }
  | { kind: "pan_workspace"; direction: "up" | "down" | "left" | "right" }
  | { kind: "center_workspace"; target: "workspace" | "selected_block" | "display_id"; displayId?: string }
  | { kind: "zoom_workspace"; level: "in" | "out" | "fit" | "reset" }
  | { kind: "set_toolbox_visibility"; visible: boolean }
  | { kind: "open_toolbox_category"; category: ToolboxCategoryId }
  | { kind: "close_toolbox_category" }
  | {
      kind: "unknown";
      reason: "empty" | "no_match" | "ambiguous" | "partial_add_block";
    };

type UnknownReason = "empty" | "no_match" | "ambiguous" | "partial_add_block";
export type ToolboxCategoryId = "flow" | "output" | "loop" | "condition" | "value" | "variable";

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
  ["start", ["them khoi bat dau", "them lenh bat dau", "cho khoi bat dau", "keo khoi bat dau ra", "them start", "khoi bat dau", "start", "bat dau"]],
  [
    "print",
    [
      "cho minh them cai khoi in",
      "cho minh them khoi in",
      "them cai khoi in",
      "them khoi hien thi",
      "them khoi in",
      "them lenh in",
      "tao lenh in",
      "cho ban ay noi",
      "cho hien chu",
      "cho khoi in",
      "them in",
      "khoi in",
      "hien thi",
      "xuat ra",
      "print",
      "in ra",
      "noi",
    ],
  ],
  [
    "repeat",
    [
      "them khoi lap lai",
      "tao mot vong lap",
      "tao vong lap",
      "them khoi lap",
      "them vong lap",
      "them lap",
      "cho khoi lap",
      "khoi lap",
      "lap lai",
      "repeat",
    ],
  ],
  [
    "if",
    [
      "them khoi dieu kien",
      "them khoi neu",
      "them cau lenh neu",
      "them dieu kien",
      "tao dieu kien",
      "khoi dieu kien",
      "them if",
      "neu thi",
      "if",
    ],
  ],
  ["variable", ["them khoi bien", "them mot bien", "them bien", "tao bien", "dat bien", "bien moi", "khoi bien"]],
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
  "em khong biet lam gi",
  "huong dan em",
  "lam gi tiep",
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

const CONFIRM_PHRASES = ["dung roi", "dong y", "ok", "okay", "chinh xac", "dung", "duoc"] as const;
const CANCEL_PHRASES = ["khong", "huy", "sai roi", "thoi", "bo qua", "dung lam"] as const;
const UNDO_PHRASES = ["hoan tac", "quay lai", "undo"] as const;
const CHECK_WORK_PHRASES = ["kiem tra bai", "em sai o dau", "xem dung chua", "kiem tra giup em"] as const;
const EXPLAIN_BLOCK_PHRASES = ["giai thich khoi nay", "khoi nay la gi", "giai thich cai nay"] as const;
const QUERY_POSITION_PHRASES = [
  "minh dang o dau",
  "dang o dau",
  "dang chon gi",
  "em dang o dau",
  "vi tri chen o dau",
  "dang chen o dau",
] as const;

const TOOLBOX_CATEGORY_PHRASES: ReadonlyArray<readonly [ToolboxCategoryId, readonly string[]]> = [
  ["flow", ["mo danh sach khoi luong", "mo nhom khoi luong", "mo nhom luong", "xem nhom luong"]],
  ["output", ["mo danh sach khoi dau ra", "mo nhom khoi dau ra", "mo nhom dau ra", "xem nhom dau ra"]],
  ["loop", ["mo danh sach khoi lap", "mo nhom khoi lap", "mo nhom lap", "xem nhom lap"]],
  ["condition", ["mo danh sach khoi dieu kien", "mo nhom khoi dieu kien", "mo nhom dieu kien", "xem nhom dieu kien"]],
  ["value", ["mo danh sach khoi gia tri", "mo nhom khoi gia tri", "mo nhom gia tri", "xem nhom gia tri"]],
  ["variable", ["mo danh sach khoi bien", "mo nhom khoi bien", "mo nhom bien", "xem nhom bien"]],
] as const;

const TOOLBOX_OPEN_PHRASES = ["mo danh sach khoi", "mo danh sach cac khoi", "mo danh sach", "mo hop khoi", "mo toolbox"] as const;
const TOOLBOX_CLOSE_PHRASES = ["thu gon danh sach khoi", "thu gon danh sach", "dong danh sach khoi", "dong danh sach", "thu gon hop khoi"] as const;

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

const START_FILLER_PHRASES = ["giup minh", "cho minh", "lam on", "toi", "minh", "ban", "giup", "hay", "cai", "mot"] as const;
const END_FILLER_WORDS = new Set(["nhe", "nha", "di", "voi", "a", "oi", "ban", "cai"]);
const PAYLOAD_END_FILLER_WORDS = new Set(["nhe", "nha", "di", "voi", "a", "oi"]);

function normalizeToken(value: string) {
  return stripVietnameseDiacritics(value.toLowerCase()).replace(/[^a-z0-9]/g, "");
}

function normalizeBasic(transcript: string): string {
  return stripVietnameseDiacritics(transcript.trim().toLowerCase())
    .replace(/^[.,!?;:"'()]+|[.,!?;:"'()]+$/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTranscript(transcript: string): string {
  let normalized = normalizeBasic(transcript);
  let changed = true;
  while (changed) {
    changed = false;
    for (const phrase of START_FILLER_PHRASES) {
      if (normalized === phrase) {
        normalized = "";
        changed = true;
      } else if (normalized.startsWith(`${phrase} `)) {
        normalized = normalized.slice(phrase.length).trim();
        changed = true;
      }
    }
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  while (tokens.length && END_FILLER_WORDS.has(tokens[tokens.length - 1]!)) tokens.pop();
  return tokens.join(" ");
}

function getAlignedTokens(transcript: string) {
  const tokens = transcript.trim().split(/\s+/).filter(Boolean).map((original) => ({
    original,
    normalized: normalizeToken(original),
  })).filter((token) => token.normalized);
  let start = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (const phrase of START_FILLER_PHRASES) {
      const phraseTokens = phrase.split(" ");
      if (tokens.slice(start, start + phraseTokens.length).map((token) => token.normalized).join(" ") === phrase) {
        start += phraseTokens.length;
        changed = true;
      }
    }
  }
  let end = tokens.length;
  while (end > start && END_FILLER_WORDS.has(tokens[end - 1]!.normalized)) end--;
  return tokens.slice(start, end);
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

function parseNumberPayload(value: string): number | null {
  const normalized = normalizeTranscript(value);
  if (/^\d+$/.test(normalized)) {
    const number = Number(normalized);
    return Number.isSafeInteger(number) ? number : null;
  }
  return parseVietnameseNumber(normalized);
}

function parseDisplayIdPayload(payload: string): string | null {
  const normalized = stripVietnameseDiacritics(payload.trim().toLowerCase())
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(cham|phay|gach)\b/g, ".")
    .replace(/\s*\.\s*/g, ".")
    .trim();
  if (/^\d+(?:\.\d+)*$/.test(normalized)) return normalized;
  if (/^\d+(?:\s+\d+)+$/.test(normalized)) return normalized.split(/\s+/).join(".");
  const parts = normalized.split(".").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const parsed = parts.map((part) => parseNumberPayload(part));
    if (parsed.every((value) => value !== null)) return parsed.join(".");
  }
  const parsed = parseNumberPayload(normalized);
  return parsed === null ? null : String(parsed);
}

function parseInsertCursorTarget(payload: string):
  | { target: "selected" | "last" | "main" }
  | { target: "display_id"; displayId: string }
  | null {
  const normalized = normalizeTranscript(payload).replace(/^(?:khoi so|khoi|so)\s+/, "").trim();
  if (!normalized) return null;
  if (normalized === "dang chon" || normalized === "nay" || normalized === "khoi dang chon") {
    return { target: "selected" };
  }
  if (normalized === "cuoi" || normalized === "cuoi cung" || normalized === "khoi cuoi") {
    return { target: "last" };
  }
  if (normalized === "chuong trinh" || normalized === "chuong trinh chinh") {
    return { target: "main" };
  }
  const displayId = parseDisplayIdPayload(normalized);
  return displayId ? { target: "display_id", displayId } : null;
}

function parseSetInsertCursorWithTarget(normalized: string): Extract<VoiceIntent, { kind: "set_insert_cursor" }> | null {
  const afterBeforeMatch = normalized.match(/^(?:(?:dat vi tri chen)|(?:chen|them))\s+(sau|truoc)\s+(.+)$/);
  if (afterBeforeMatch?.[1] && afterBeforeMatch[2]) {
    const target = parseInsertCursorTarget(afterBeforeMatch[2]);
    if (!target) return null;
    return {
      kind: "set_insert_cursor",
      position: afterBeforeMatch[1] === "sau" ? "after" : "before",
      ...target,
    };
  }

  const insideMatch = normalized.match(/^(?:(?:dat vi tri chen)|(?:chen|dua))\s+(?:vao\s+)?(?:ben\s+)?trong\s+(.+)$/);
  if (insideMatch?.[1]) {
    const target = parseInsertCursorTarget(insideMatch[1]);
    if (!target) return null;
    return { kind: "set_insert_cursor", position: "inside", ...target };
  }

  return null;
}

function parseWorkspaceNavigation(normalized: string): VoiceIntent | null {
  if (normalized === "cuon len" || normalized === "keo len") return { kind: "pan_workspace", direction: "up" };
  if (normalized === "cuon xuong" || normalized === "keo xuong") return { kind: "pan_workspace", direction: "down" };
  if (normalized === "cuon sang trai" || normalized === "keo sang trai" || normalized === "qua trai") {
    return { kind: "pan_workspace", direction: "left" };
  }
  if (normalized === "cuon sang phai" || normalized === "keo sang phai" || normalized === "qua phai") {
    return { kind: "pan_workspace", direction: "right" };
  }

  const centerBlockMatch = normalized.match(/^dua\s+khoi\s+(.+?)\s+ve giua$/);
  if (centerBlockMatch?.[1]) {
    const rawTarget = centerBlockMatch[1].trim();
    if (rawTarget === "dang chon" || rawTarget === "nay" || rawTarget === "hien tai") {
      return { kind: "center_workspace", target: "selected_block" };
    }
    const displayId = parseDisplayIdPayload(rawTarget);
    return displayId ? { kind: "center_workspace", target: "display_id", displayId } : null;
  }

  if (
    normalized === "ve giua" ||
    normalized === "dua ve giua" ||
    normalized === "can giua workspace" ||
    normalized === "can giua man hinh"
  ) {
    return { kind: "center_workspace", target: "workspace" };
  }

  if (normalized === "vua man hinh" || normalized === "hien thi toan bo chuong trinh") {
    return { kind: "zoom_workspace", level: "fit" };
  }
  if (normalized === "phong to") return { kind: "zoom_workspace", level: "in" };
  if (normalized === "thu nho") return { kind: "zoom_workspace", level: "out" };
  if (normalized === "dat lai zoom" || normalized === "dat lai phong to") {
    return { kind: "zoom_workspace", level: "reset" };
  }

  return null;
}

function parseToolboxCommand(normalized: string): VoiceIntent | null {
  if (normalized === "dong nhom khoi") return { kind: "close_toolbox_category" };
  for (const [category, phrases] of TOOLBOX_CATEGORY_PHRASES) {
    if (matchPhrasePrefix(normalized, phrases)) return { kind: "open_toolbox_category", category };
  }
  if (matchPhrasePrefix(normalized, TOOLBOX_OPEN_PHRASES)) return { kind: "set_toolbox_visibility", visible: true };
  if (matchPhrasePrefix(normalized, TOOLBOX_CLOSE_PHRASES)) return { kind: "set_toolbox_visibility", visible: false };
  return null;
}

function normalizeVariableName(payload: string): string | null {
  const trimmed = trimOriginalPayload(payload);
  if (!trimmed) return null;
  const normalized = stripVietnameseDiacritics(trimmed.toLowerCase())
    .replace(/\b(diem so|diem)\b/g, "diem")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || null;
}

function trimOriginalPayload(payload: string): string {
  const tokens = payload.trim().split(/\s+/).filter(Boolean);
  while (tokens.length) {
    const normalized = normalizeToken(tokens[tokens.length - 1]!);
    if (!PAYLOAD_END_FILLER_WORDS.has(normalized)) break;
    tokens.pop();
  }
  return tokens.join(" ").replace(/^[.,!?;:"'()]+|[.,!?;:"'()]+$/g, "").trim();
}

function originalPayloadAfterPrefix(original: string, normalized: string, normalizedPayload: string): string {
  const originalTokens = getAlignedTokens(original).map((token) => token.original);
  const normalizedTokens = normalized.split(/\s+/).filter(Boolean);
  const payloadTokens = normalizedPayload.split(/\s+/).filter(Boolean).length;
  const prefixLength = Math.max(0, normalizedTokens.length - payloadTokens);
  return trimOriginalPayload(originalTokens.slice(prefixLength).join(" "));
}

function originalPayloadAt(original: string, prefixLength: number, payloadLength: number): string {
  const originalTokens = getAlignedTokens(original).map((token) => token.original);
  return trimOriginalPayload(originalTokens.slice(prefixLength, prefixLength + payloadLength).join(" "));
}

function parseTextPayload(original: string, normalized: string, match: RegExpMatchArray): string | null {
  const payload = match[1]?.trim();
  if (!payload) return null;
  const text = originalPayloadAfterPrefix(original, normalized, payload);
  return text || null;
}

function parseRepeatTimesFromRemaining(remaining: string): number | undefined {
  const match = remaining.match(/^(?:lap lai|lap)?\s*(.+?)\s+lan(?:\s|$)/);
  if (!match?.[1]) return undefined;
  const parsed = parseNumberPayload(match[1]);
  return parsed === null ? undefined : parsed;
}

function parsePrintVariableFromRemaining(original: string, matchedPhrase: string, remaining: string): string | undefined {
  const match = remaining.match(/^(?:bien|gia tri)\s+(.+?)(?:\s+(?:vao ben trong|vao trong|ben trong|trong)\s+.+)?$/);
  if (!match?.[1]) return undefined;
  const prefixLength = matchedPhrase.split(/\s+/).filter(Boolean).length + 1;
  const name = originalPayloadAt(original, prefixLength, match[1].split(/\s+/).filter(Boolean).length);
  return normalizeVariableName(name) ?? undefined;
}

function parsePrintTextFromRemaining(original: string, matchedPhrase: string, remaining: string): string | undefined {
  const match = remaining.match(/^(?:chu|ra)?\s*(.+?)(?:\s+(?:vao ben trong|vao trong|ben trong|trong)\s+.+)?$/);
  if (!match?.[1]) return undefined;
  if (/^(?:bien|gia tri)(?:\s|$)/.test(match[1])) return undefined;
  const placementOnly = INSIDE_CONNECTORS.some((connector) => remaining === connector || remaining.startsWith(`${connector} `));
  if (placementOnly) return undefined;
  if (!remaining.startsWith("chu ") && !remaining.startsWith("ra ") && matchedPhrase !== "noi" && matchedPhrase !== "cho ban ay noi" && matchedPhrase !== "cho hien chu" && !matchedPhrase.includes("khoi in") && matchedPhrase !== "them in") {
    return undefined;
  }
  const explicitOffset = remaining.startsWith("chu ") || remaining.startsWith("ra ") ? 1 : 0;
  const prefixLength = matchedPhrase.split(/\s+/).filter(Boolean).length + explicitOffset;
  const text = originalPayloadAt(original, prefixLength, match[1].split(/\s+/).filter(Boolean).length);
  return text || undefined;
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
  if (!normalized) {
    const rawNormalized = normalizeBasic(original);
    if (matchPhrasePrefix(rawNormalized, ASK_HINT_PHRASES)) return { kind: "ask_hint" };
    return unknown("empty");
  }

  if (matchPhrasePrefix(normalized, CONFIRM_PHRASES)) return { kind: "confirm" };
  if (matchPhrasePrefix(normalized, CANCEL_PHRASES)) return { kind: "cancel" };
  if (normalized === "buoc truoc" || normalized === "ve buoc truoc") return { kind: "navigate_step", target: "previous" };
  if (normalized === "buoc sau" || normalized === "sang buoc sau") return { kind: "navigate_step", target: "next" };
  const stepNavigation = normalized.match(/^(?:den|mo|chuyen den) buoc (.+)$/);
  if (stepNavigation) {
    const stepNumber = parseNumberPayload(stepNavigation[1]);
    if (stepNumber !== null) return { kind: "navigate_step", target: "number", stepNumber };
  }
  if (matchPhrasePrefix(normalized, UNDO_PHRASES)) return { kind: "undo_last" };
  if (matchPhrasePrefix(normalized, CHECK_WORK_PHRASES)) return { kind: "check_work" };
  if (matchPhrasePrefix(normalized, EXPLAIN_BLOCK_PHRASES)) return { kind: "explain_block" };
  if (matchPhrasePrefix(normalized, QUERY_POSITION_PHRASES)) return { kind: "query_position" };

  const workspaceNavigation = parseWorkspaceNavigation(normalized);
  if (workspaceNavigation) return workspaceNavigation;

  const toolboxCommand = parseToolboxCommand(normalized);
  if (toolboxCommand) return toolboxCommand;

  const selectMatch = normalized.match(/^chon khoi\s+(.+)$/);
  if (selectMatch?.[1]) {
    const target = selectMatch[1].trim();
    if (target === "cuoi" || target === "cuoi cung") return { kind: "select_block", target: "last" };
    const displayId = parseDisplayIdPayload(target);
    if (displayId) return { kind: "select_block", target: "display_id", displayId };
    const typeMatch = target.match(/^(.+?)(?:\s+thu\s+(hai|ba|bon|tu|nam|\d+))?$/);
    const blockType = typeMatch?.[1] ? findParentHint(typeMatch[1]) : undefined;
    const ordinal = typeMatch?.[2] ? parseNumberPayload(typeMatch[2]) : undefined;
    return blockType && (ordinal === undefined || (ordinal !== null && ordinal > 0))
      ? { kind: "select_block", target: "block_type", blockType, ...(typeof ordinal === "number" ? { ordinal } : {}) }
      : unknown("no_match");
  }
  if (normalized === "chon chuong trinh chinh" || normalized === "chon chuong trinh") {
    return { kind: "select_block", target: "main" };
  }

  const insertCursorWithTarget = parseSetInsertCursorWithTarget(normalized);
  if (insertCursorWithTarget) return insertCursorWithTarget;

  if (normalized === "chen truoc") return { kind: "set_insert_cursor", position: "before" };
  if (normalized === "chen sau") return { kind: "set_insert_cursor", position: "after" };
  if (normalized === "chen vao trong" || normalized === "vao trong") return { kind: "set_insert_cursor", position: "inside" };
  if (normalized === "them o cuoi" || normalized === "ra ngoai") return { kind: "set_insert_cursor", position: "end" };

  const deleteIdMatch = normalized.match(/^(?:xoa|bo)\s+(?:cai\s+)?khoi\s+(.+)$/);
  if (deleteIdMatch?.[1]) {
    const target = deleteIdMatch[1].trim();
    if (target === "dang chon" || target === "nay") return { kind: "delete_block", target: "selected" };
    if (target === "cuoi" || target === "cuoi cung" || target === "vua them") return { kind: "delete_block", target: "last" };
    const displayId = parseDisplayIdPayload(target);
    return displayId ? { kind: "delete_block", target: "display_id", displayId } : unknown("no_match");
  }

  // Preserve legacy delete_last for phrases that do not carry a normal
  // "khối <target>" object, e.g. "xóa lệnh cuối".
  if (matchPhrasePrefix(normalized, DELETE_LAST_PHRASES)) return { kind: "delete_last" };
  if (
    normalized === "xoa" ||
    normalized === "xoa khoi" ||
    normalized === "bo khoi" ||
    normalized === "xoa cai nay" ||
    normalized === "bo cai nay" ||
    normalized === "bo khoi nay" ||
    normalized === "xoa khoi dang chon"
  ) {
    return { kind: "delete_block", target: "selected" };
  }
  if (normalized === "bo cai vua roi" || normalized === "xoa cai vua roi") {
    return { kind: "delete_block", target: "last" };
  }

  const moveInsideMatch = normalized.match(/^dua\s+(?:khoi\s+)?(.+?)\s+vao trong\s+(?:khoi\s+)?(.+)$/);
  if (moveInsideMatch?.[1] && moveInsideMatch[2]) {
    const rawTarget = moveInsideMatch[1].trim();
    const parentDisplayId = parseDisplayIdPayload(moveInsideMatch[2].trim());
    const target =
      rawTarget === "nay" || rawTarget === "dang chon" || rawTarget === "khoi nay"
        ? { target: "selected" as const }
        : { target: "display_id" as const, displayId: parseDisplayIdPayload(rawTarget) ?? undefined };
    if (parentDisplayId && (target.target === "selected" || target.displayId)) {
      return { kind: "move_block", direction: "inside", parentDisplayId, ...target };
    }
  }
  const moveMatch = normalized.match(/^(?:di chuyen|dua)\s+(?:khoi\s+)?(.+?)\s+(len tren|xuong duoi|ra ngoai)$/);
  if (moveMatch?.[1] && moveMatch[2]) {
    const rawTarget = moveMatch[1].trim();
    const direction = moveMatch[2] === "len tren" ? "up" : moveMatch[2] === "xuong duoi" ? "down" : "outside";
    if (rawTarget === "nay" || rawTarget === "dang chon" || rawTarget === "khoi nay") {
      return { kind: "move_block", target: "selected", direction };
    }
    const displayId = parseDisplayIdPayload(rawTarget);
    return displayId ? { kind: "move_block", target: "display_id", displayId, direction } : unknown("no_match");
  }

  const variableOutputMatch = normalized.match(/^(?:in bien|hien thi bien|in gia tri|in gia tri bien)\s+(.+)$/);
  if (variableOutputMatch?.[1]) {
    const name = normalizeVariableName(variableOutputMatch[1]);
    return name ? { kind: "set_variable_output", name } : unknown("no_match");
  }

  const textMatch = normalized.match(
    /^(?:sua noi dung thanh|doi noi dung thanh|sua chu thanh|doi chu thanh|dat chu|go chu|noi dung la|cho chu la|cho chu|viet chu|chu la|in chu|in ra|hien thi|xuat ra|cho hien chu|cho ban ay noi|noi)\s+(.+)$/,
  );
  if (textMatch) {
    const text = parseTextPayload(original, normalized, textMatch);
    return text ? { kind: "set_text", text } : unknown("no_match");
  }

  const numberMatch = normalized.match(
    /^(?:sua so lan thanh|doi so lan thanh|sua so thanh|doi so thanh|dat so lan lap la|dat so lan lap|dat so|gia tri(?: la)?|cho so|dat bang|so la|gan bang)\s+(.+)$/,
  );
  if (numberMatch) {
    if (/-\s*\d/.test(original)) return unknown("no_match");
    const payload = numberMatch[1].trim();
    const parsed = parseNumberPayload(payload);
    return parsed === null ? unknown("no_match") : { kind: "set_number", value: parsed };
  }

  const repeatNumberMatch = normalized.match(/^(?:cho lap|lap lai|lap)\s+(.+?)\s+lan$/);
  if (repeatNumberMatch?.[1]) {
    if (/-\s*\d/.test(original)) return unknown("no_match");
    const parsed = parseNumberPayload(repeatNumberMatch[1]);
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
    const fields: Extract<VoiceIntent, { kind: "add_block" }>["fields"] = {};
    let placementRemaining = remaining;
    if (matchedBlock.blockType === "repeat") {
      if (/-\s*\d/.test(original)) return unknown("no_match");
      const times = parseRepeatTimesFromRemaining(remaining);
      if (times !== undefined) fields.times = times;
    }
    if (matchedBlock.blockType === "print") {
      const variableName = parsePrintVariableFromRemaining(original, matchedBlock.phrase, remaining);
      if (variableName) fields.variableName = variableName;
      const text = parsePrintTextFromRemaining(original, matchedBlock.phrase, remaining);
      if (text && !variableName) fields.text = text;
      if (remaining.startsWith("chu ") || remaining.startsWith("ra ") || remaining.startsWith("bien ") || remaining.startsWith("gia tri ")) {
        const connectorIndex = remaining.search(/\s+(?:vao ben trong|vao trong|ben trong|trong)\s+/);
        placementRemaining = connectorIndex >= 0 ? remaining.slice(connectorIndex + 1) : "";
      }
    }
    if (remaining) {
      const connector = matchPhrasePrefix(placementRemaining, INSIDE_CONNECTORS);
      if (connector) {
        const afterConnector = placementRemaining.slice(connector.length).trim();
        const parentHint = afterConnector ? findParentHint(afterConnector) : undefined;
        if (parentHint) {
          return {
            kind: "add_block",
            blockType: matchedBlock.blockType,
            position: { kind: "inside", parentHint },
            ...(Object.keys(fields).length ? { fields } : {}),
          };
        }
      }
    }
    return { kind: "add_block", blockType: matchedBlock.blockType, ...(Object.keys(fields).length ? { fields } : {}) };
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
