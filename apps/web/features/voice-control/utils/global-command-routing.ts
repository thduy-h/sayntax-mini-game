export type GlobalCommandTarget = "website" | "workspace" | "workspace_not_ready" | "modal_blocked";

export interface GlobalCommandExecutionResult {
  command: string;
  feedback: string;
  handled: boolean;
  outcome?: "applied" | "not_applied" | "unsupported" | "pending";
  pendingPreview?: string | null;
  target: GlobalCommandTarget;
  understoodAs?: string;
}

export interface WorkspaceCommandRegistration {
  handleTextCommand: (command: string) => GlobalCommandExecutionResult;
  id: string;
  lessonSlug: string;
  lessonTitle: string;
  modalOpen: boolean;
  pendingPreview?: string | null;
  sampleUtterance?: string | null;
  stepTitle?: string | null;
  workspaceReady: boolean;
}

export function chooseGlobalCommandTarget(workspace: WorkspaceCommandRegistration | null | undefined): GlobalCommandTarget {
  if (!workspace) return "website";
  if (workspace.modalOpen) return "modal_blocked";
  if (!workspace.workspaceReady) return "workspace_not_ready";
  return "workspace";
}

export function shouldClearCommandResultForLesson(previousLessonSlug: string | null, nextLessonSlug: string) {
  return previousLessonSlug !== null && previousLessonSlug !== nextLessonSlug;
}

export function commandResultForLessonRegistration<T>(
  currentResult: T,
  previousLessonSlug: string | null,
  nextLessonSlug: string,
) {
  return shouldClearCommandResultForLesson(previousLessonSlug, nextLessonSlug) ? null : currentResult;
}

export function createGlobalCommandRegistry() {
  let workspace: WorkspaceCommandRegistration | null = null;

  return {
    getWorkspace() {
      return workspace;
    },
    register(nextWorkspace: WorkspaceCommandRegistration) {
      workspace = nextWorkspace;
      return () => {
        if (workspace?.id === nextWorkspace.id) workspace = null;
      };
    },
    submit(command: string, websiteHandler: (command: string) => GlobalCommandExecutionResult) {
      const trimmed = command.trim();
      if (!trimmed) {
        return {
          command,
          feedback: "Hãy nhập một câu lệnh.",
          handled: false,
          target: chooseGlobalCommandTarget(workspace),
        } satisfies GlobalCommandExecutionResult;
      }
      const target = chooseGlobalCommandTarget(workspace);
      if (target === "modal_blocked") {
        return {
          command: trimmed,
          feedback: "Bài học đang hiển thị hộp thoại hoàn thành. Hãy đóng hộp thoại trước khi nhập lệnh.",
          handled: false,
          target,
        } satisfies GlobalCommandExecutionResult;
      }
      if (target === "workspace_not_ready") {
        return {
          command: trimmed,
          feedback: "Workspace đang khởi tạo. Vui lòng thử lại sau giây lát.",
          handled: false,
          target,
        } satisfies GlobalCommandExecutionResult;
      }
      if (target === "workspace" && workspace) return workspace.handleTextCommand(trimmed);
      return websiteHandler(trimmed);
    },
  };
}
