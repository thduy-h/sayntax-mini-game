import type { BlockKind } from "@shecancode/shared-types";
import { COMMAND_REGISTRY, type CommandDefinition } from "./command-registry";
import { parseVoiceIntent, type VoiceIntent } from "./parse-intent";
import { normalizeVietnameseTranscript } from "./transcript-normalizer";

export const SPEECH_RANKING_THRESHOLDS = {
  accept: 0.72,
  ambiguousDelta: 0.08,
  reject: 0.42,
} as const;

export interface SpeechAlternativeInput {
  confidence?: number;
  transcript: string;
}

export interface VoiceCommandRankingContext {
  expectedBlockType?: BlockKind;
  expectedIntentKind?: VoiceIntent["kind"];
  sampleUtterance?: string | null;
}

export interface RankedSpeechAlternative {
  confidence?: number;
  intent: VoiceIntent;
  matchedCommand?: CommandDefinition["id"];
  normalized: string;
  score: number;
  transcript: string;
}

export type SpeechAlternativeRanking =
  | { status: "accept"; best: RankedSpeechAlternative; candidates: RankedSpeechAlternative[] }
  | { status: "confirm"; best: RankedSpeechAlternative; candidates: RankedSpeechAlternative[] }
  | { status: "reject"; best: RankedSpeechAlternative | null; candidates: RankedSpeechAlternative[] };

function normalizedLevenshteinSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let lastDiagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const oldDiagonal = previous[j]!;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min(previous[j]! + 1, previous[j - 1]! + 1, lastDiagonal + cost);
      lastDiagonal = oldDiagonal;
    }
  }
  return 1 - previous[right.length]! / Math.max(left.length, right.length);
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = new Set(normalizeVietnameseTranscript(left).tokens);
  const rightTokens = new Set(normalizeVietnameseTranscript(right).tokens);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function scoreAlias(normalized: string, alias: string) {
  const aliasNormalized = normalizeVietnameseTranscript(alias).ascii;
  if (!aliasNormalized) return 0;
  if (normalized === aliasNormalized) return 1;
  if (normalized.startsWith(`${aliasNormalized} `) || aliasNormalized.startsWith(`${normalized} `)) return 0.92;
  return Math.max(tokenSimilarity(normalized, aliasNormalized), normalizedLevenshteinSimilarity(normalized, aliasNormalized) * 0.85);
}

function findBestRegistryMatch(normalized: string) {
  let best: { command: CommandDefinition; score: number } | null = null;
  for (const command of COMMAND_REGISTRY) {
    const aliases = [command.canonical, ...command.aliases];
    const commandScore = Math.max(...aliases.map((alias) => scoreAlias(normalized, alias)));
    if (!best || commandScore > best.score) best = { command, score: commandScore };
  }
  return best;
}

function intentMatchesCommand(intent: VoiceIntent, command: CommandDefinition) {
  if (intent.kind !== command.intentKind) return false;
  if (intent.kind === "add_block" && command.blockType) return intent.blockType === command.blockType;
  return true;
}

function intentMatchesContext(intent: VoiceIntent, context?: VoiceCommandRankingContext) {
  if (!context?.expectedIntentKind) return 0;
  if (intent.kind !== context.expectedIntentKind) return -0.08;
  if (intent.kind === "add_block" && context.expectedBlockType) {
    return intent.blockType === context.expectedBlockType ? 0.24 : -0.14;
  }
  return 0.18;
}

function scoreRequiredParameters(intent: VoiceIntent, context?: VoiceCommandRankingContext) {
  if (context?.expectedIntentKind === "set_number") return intent.kind === "set_number" ? 0.1 : -0.08;
  if (context?.expectedIntentKind === "set_text") return intent.kind === "set_text" && intent.text.trim() ? 0.1 : -0.08;
  if (context?.expectedIntentKind === "set_variable_output") return intent.kind === "set_variable_output" && intent.name ? 0.1 : -0.08;
  return 0;
}

function rankOneAlternative(alternative: SpeechAlternativeInput, context?: VoiceCommandRankingContext): RankedSpeechAlternative {
  const normalized = normalizeVietnameseTranscript(alternative.transcript).ascii;
  const intent = parseVoiceIntent(alternative.transcript);
  const registryMatch = findBestRegistryMatch(normalized);
  const confidence = Number.isFinite(alternative.confidence) ? Math.max(0, Math.min(1, alternative.confidence ?? 0)) : undefined;
  const knownIntent = intent.kind !== "unknown";
  const commandAlignment = registryMatch && intentMatchesCommand(intent, registryMatch.command) ? 0.08 : 0;
  const sampleScore = context?.sampleUtterance ? scoreAlias(normalized, context.sampleUtterance) * 0.14 : 0;
  const score =
    (knownIntent ? 0.38 : 0) +
    (registryMatch?.score ?? 0) * 0.28 +
    commandAlignment +
    intentMatchesContext(intent, context) +
    scoreRequiredParameters(intent, context) +
    sampleScore +
    (confidence && confidence > 0 ? confidence * 0.08 : 0);
  return {
    confidence: alternative.confidence,
    intent,
    matchedCommand: registryMatch?.command.id,
    normalized,
    score: Math.max(0, Math.min(1, score)),
    transcript: alternative.transcript.trim(),
  };
}

export function rankSpeechAlternatives(
  alternatives: readonly SpeechAlternativeInput[],
  context?: VoiceCommandRankingContext,
): SpeechAlternativeRanking {
  const candidates = alternatives
    .map((alternative) => ({ ...alternative, transcript: alternative.transcript.trim() }))
    .filter((alternative) => alternative.transcript)
    .map((alternative) => rankOneAlternative(alternative, context))
    .sort((left, right) => right.score - left.score);
  const best = candidates[0] ?? null;
  if (!best || best.score < SPEECH_RANKING_THRESHOLDS.reject || best.intent.kind === "unknown") {
    return { status: "reject", best, candidates };
  }
  const second = candidates[1];
  if (
    best.score < SPEECH_RANKING_THRESHOLDS.accept ||
    (second && best.score - second.score < SPEECH_RANKING_THRESHOLDS.ambiguousDelta)
  ) {
    return { status: "confirm", best, candidates: candidates.slice(0, 2) };
  }
  return { status: "accept", best, candidates };
}
