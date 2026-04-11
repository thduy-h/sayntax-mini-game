// Public re-exports for the lesson engine.
//
// V1 (legacy `LessonCompletionLogic` + hardcoded `lessons` const) has been
// removed. Only the V2 Scratch-style action model and its seed data ship
// from this package now.

export * from "./seed-v2";
export * from "./action-model";
export { flattenBlocks, normalizeText, comparableValue, findVariableBlock, validatePrintText } from "./helpers";
