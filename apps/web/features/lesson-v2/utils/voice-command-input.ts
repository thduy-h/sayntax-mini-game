import type { LessonStepAction } from "@shecancode/lesson-engine";
import {
  parseVoiceIntent,
  rankSpeechAlternatives,
  type SpeechAlternativeInput,
  type SpeechAlternativeRanking,
  type VoiceCommandRankingContext,
  type VoiceIntent,
} from "@shecancode/voice-parser";

export type VoiceCommandSource = "microphone" | "text";

export interface ParsedVoiceCommandInput {
  intent: VoiceIntent;
  source: VoiceCommandSource;
  transcript: string;
}

export function parseVoiceCommandInput(source: VoiceCommandSource, rawTranscript: string): ParsedVoiceCommandInput | null {
  const transcript = rawTranscript.trim();
  if (!transcript) return null;
  return {
    intent: parseVoiceIntent(transcript),
    source,
    transcript,
  };
}

export function createVoiceCommandRankingContext(
  action: LessonStepAction | null | undefined,
  sampleUtterance?: string | null,
): VoiceCommandRankingContext {
  if (!action) return { sampleUtterance };
  switch (action.kind) {
    case "add_block":
      return { expectedBlockType: action.blockType, expectedIntentKind: "add_block", sampleUtterance };
    case "insert_into":
      return { expectedBlockType: action.childBlockType, expectedIntentKind: "add_block", sampleUtterance };
    case "set_text":
      return { expectedIntentKind: "set_text", sampleUtterance };
    case "set_number":
      return { expectedIntentKind: "set_number", sampleUtterance };
    case "set_variable_output":
      return { expectedIntentKind: "set_variable_output", sampleUtterance };
    case "run_program":
      return { expectedIntentKind: "run_program", sampleUtterance };
    case "ask_hint":
      return { expectedIntentKind: "ask_hint", sampleUtterance };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function rankVoiceCommandAlternatives(
  alternatives: readonly SpeechAlternativeInput[],
  context?: VoiceCommandRankingContext,
): SpeechAlternativeRanking {
  return rankSpeechAlternatives(alternatives, context);
}
