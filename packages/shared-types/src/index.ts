export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type AppRole = "student" | "admin";
export type FontScale = "default" | "large" | "x-large";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type ProgramRunStatus = "success" | "error";
export type VoiceCommandStatus = "success" | "unsupported" | "error";
export type BlockKind =
  | "start"
  | "print"
  | "repeat"
  | "if"
  | "variable"
  | "variable_get"
  | "text_literal"
  | "number_literal"
  | "boolean_literal";

export const USER_ROLES: AppRole[] = ["student", "admin"];
export const BLOCK_TYPES: BlockKind[] = [
  "start",
  "print",
  "repeat",
  "if",
  "variable",
  "variable_get",
  "text_literal",
  "number_literal",
  "boolean_literal",
];

export const roleLabels: Record<AppRole, string> = {
  admin: "Quản trị viên / Người hướng dẫn",
  student: "Học sinh",
};

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  userId: string;
  displayName: string;
  ageRange: string | null;
  gradeLevel: string | null;
  schoolName: string | null;
  goals: string | null;
  disabilitySupportNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessibilitySettings {
  userId: string;
  fontScale: FontScale;
  highContrast: boolean;
  reducedMotion: boolean;
  audioInstructions: boolean;
  largeTouchTargets: boolean;
  keyboardNavigationHints: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  lessonCount: number;
  estimatedMinutes: number;
}

export interface Course extends CourseSummary {
  audience: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPreview {
  id: string;
  slug: string;
  databaseLessonId: string;
  title: string;
  summary: string;
  stepCount: number;
  orderIndex: number;
}

export interface LessonWithSteps extends LessonPreview {
  description: string;
  estimatedMinutes: number;
  learningGoals: string[];
  steps: LessonStepSeed[];
}

export interface Lesson {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  orderIndex: number;
  estimatedMinutes: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceBlock {
  id: string;
  type: BlockKind;
  fields?: Record<string, string | number | boolean>;
  inputs?: Record<string, WorkspaceBlock>;
  children?: WorkspaceBlock[];
}

export interface ProgramWorkspace {
  version: 1;
  blocks: WorkspaceBlock[];
}

export interface ProgramExecutionResult {
  errors: string[];
  output: string[];
  success: boolean;
  variables: Record<string, string | number | boolean>;
}

export type LessonCompletionLogic =
  | {
      type: "required_block_types";
      blockTypes: BlockKind[];
    }
  | {
      type: "ordered_block_types";
      blockTypes: BlockKind[];
    }
  | {
      type: "print_text";
      text: string;
    }
  | {
      type: "print_sequence";
      texts: string[];
    }
  | {
      type: "repeat_print";
      count: number;
      text: string;
    }
  | {
      type: "max_top_level_blocks";
      blockTypes: BlockKind[];
      max: number;
    }
  | {
      type: "if_print";
      text: string;
    }
  | {
      type: "variable_name";
      name: string;
    }
  | {
      type: "variable_value";
      name: string;
      value: string | number | boolean;
    }
  | {
      type: "variable_then_print";
      name: string;
      value: string | number | boolean;
    };

export interface LessonStepSeed {
  id: string;
  databaseStepId: string;
  instructions: string;
  hints: string[];
  orderIndex: number;
  title: string;
  expectedResult: JsonValue;
  completionLogic: LessonCompletionLogic;
  starterWorkspace: ProgramWorkspace;
}

export interface LessonStepEvaluationResult {
  completed: boolean;
  feedback: string;
}

export interface LessonStep {
  id: string;
  lessonId: string;
  title: string;
  orderIndex: number;
  instructions: string;
  hints: string[];
  expectedResult: JsonValue;
  completionLogic: JsonValue;
  starterWorkspace: ProgramWorkspace;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramRecord {
  id: string;
  userId: string;
  lessonId: string;
  lessonStepId: string;
  workspaceState: ProgramWorkspace;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramRunRecord {
  id: string;
  programId: string;
  userId: string;
  lessonId: string;
  lessonStepId: string;
  status: ProgramRunStatus;
  success: boolean;
  executionResult: JsonValue;
  errorMessage: string | null;
  createdAt: string;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  lessonId: string;
  lessonStepId: string;
  status: ProgressStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfidenceCheckinRecord {
  id: string;
  userId: string;
  lessonId: string;
  confidenceLevel: number;
  comfortLevel: number;
  reflection: string | null;
  createdAt: string;
}

export type VoiceCommandAction =
  | {
      type: "add_block";
      blockType: BlockKind;
      repeatCount?: number;
    }
  | {
      type: "delete_last_block";
    }
  | {
      type: "run_program";
    }
  | {
      type: "set_selected_block_value";
      value: string | number;
    }
  | {
      type: "read_instructions";
    }
  | {
      type: "check_answer";
    }
  | {
      type: "unsupported";
      reason: string;
    };

export interface VoiceCommandLogRecord {
  id: string;
  userId: string;
  lessonId: string | null;
  lessonStepId: string | null;
  transcript: string;
  normalizedTranscript: string;
  parsedAction: VoiceCommandAction;
  status: VoiceCommandStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface RoleModelEntry {
  id: string;
  name: string;
  headline: string;
  summary: string;
  story: string;
  quote: string | null;
  imagePath: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
