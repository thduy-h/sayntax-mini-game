import type { VoiceIntent } from "@shecancode/voice-parser";

export type WorkspacePanDirection = "up" | "down" | "left" | "right";

export interface WorkspacePanMetrics {
  viewHeight: number;
  viewLeft: number;
  viewTop: number;
  viewWidth: number;
}

export function calculateWorkspacePanTarget(
  metrics: WorkspacePanMetrics,
  direction: WorkspacePanDirection,
  ratio = 0.6,
) {
  const horizontalDelta = metrics.viewWidth * ratio;
  const verticalDelta = metrics.viewHeight * ratio;
  return {
    x: metrics.viewLeft + (direction === "right" ? horizontalDelta : direction === "left" ? -horizontalDelta : 0),
    y: metrics.viewTop + (direction === "down" ? verticalDelta : direction === "up" ? -verticalDelta : 0),
  };
}

export function clampWorkspaceScale(scale: number, minScale = 0.7, maxScale = 1.4) {
  return Math.max(minScale, Math.min(maxScale, scale));
}

export function isWorkspaceViewportIntent(intent: VoiceIntent) {
  return intent.kind === "pan_workspace" || intent.kind === "center_workspace" || intent.kind === "zoom_workspace";
}

export function isToolboxNavigationIntent(intent: VoiceIntent) {
  return intent.kind === "set_toolbox_visibility" || intent.kind === "open_toolbox_category" || intent.kind === "close_toolbox_category";
}

export function requiresVoiceConfirmation(intent: VoiceIntent) {
  return intent.kind === "delete_block" || intent.kind === "delete_last" || intent.kind === "move_block";
}

export function createsProgramUndoSnapshot(intent: VoiceIntent) {
  return (
    intent.kind === "add_block" ||
    intent.kind === "insert_into" ||
    intent.kind === "set_text" ||
    intent.kind === "set_number" ||
    intent.kind === "set_variable_output" ||
    intent.kind === "delete_block" ||
    intent.kind === "delete_last" ||
    intent.kind === "move_block"
  );
}

export function shouldEvaluateLessonAfterIntent(intent: VoiceIntent) {
  return !isWorkspaceViewportIntent(intent) && !isToolboxNavigationIntent(intent);
}
