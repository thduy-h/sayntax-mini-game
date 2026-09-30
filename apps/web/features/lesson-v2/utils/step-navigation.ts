export interface StepNavigationPlan {
  status: "invalid" | "same" | "navigate";
  replacesWorkspace: boolean;
  needsConfirmation: boolean;
}

export function willReplaceWorkspace(currentIndex: number, targetIndex: number, workspaceHasBlocks: boolean) {
  return !workspaceHasBlocks || targetIndex !== currentIndex + 1;
}

export function planStepNavigation(
  currentIndex: number,
  targetIndex: number,
  stepCount: number,
  workspaceHasBlocks: boolean,
  workspaceMatchesLoadedStarter: boolean,
): StepNavigationPlan {
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= stepCount) {
    return { status: "invalid", replacesWorkspace: false, needsConfirmation: false };
  }
  if (targetIndex === currentIndex) {
    return { status: "same", replacesWorkspace: false, needsConfirmation: false };
  }
  const replacesWorkspace = willReplaceWorkspace(currentIndex, targetIndex, workspaceHasBlocks);
  return {
    status: "navigate",
    replacesWorkspace,
    needsConfirmation: replacesWorkspace && workspaceHasBlocks && !workspaceMatchesLoadedStarter,
  };
}

// Compare Blockly's own persisted content, excluding viewport/toolbox UI state.
// This keeps a clean starter workspace warning-free and detects a restored
// starter after undo without inventing a separate edit counter.
export function workspaceContentSignature(state: Record<string, unknown>) {
  return JSON.stringify({ blocks: state.blocks ?? null, variables: state.variables ?? null });
}
