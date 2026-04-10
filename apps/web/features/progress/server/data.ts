import type { ProgressStatus } from "@shecancode/shared-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ProgressRow {
  lesson_id: string;
  lesson_step_id: string;
  status: ProgressStatus;
}

export async function getLessonProgressMap(databaseLessonId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {} satisfies Record<string, ProgressStatus>;
  }

  const { data, error } = await supabase
    .from("progress")
    .select("lesson_step_id, status")
    .eq("user_id", user.id)
    .eq("lesson_id", databaseLessonId)
    .returns<Pick<ProgressRow, "lesson_step_id" | "status">[]>();

  if (error || !data) {
    return {} satisfies Record<string, ProgressStatus>;
  }

  return Object.fromEntries(data.map((row) => [row.lesson_step_id, row.status])) as Record<string, ProgressStatus>;
}

export async function getLessonProgressSummaries(databaseLessonIds: string[]) {
  if (!databaseLessonIds.length) {
    return {} as Record<string, { completed: number; inProgress: number }>;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {} as Record<string, { completed: number; inProgress: number }>;
  }

  const { data, error } = await supabase
    .from("progress")
    .select("lesson_id, status")
    .eq("user_id", user.id)
    .in("lesson_id", databaseLessonIds)
    .returns<Pick<ProgressRow, "lesson_id" | "status">[]>();

  if (error || !data) {
    return {} as Record<string, { completed: number; inProgress: number }>;
  }

  return data.reduce<Record<string, { completed: number; inProgress: number }>>((acc, row) => {
    const current = acc[row.lesson_id] ?? { completed: 0, inProgress: 0 };

    if (row.status === "completed") {
      current.completed += 1;
    }

    if (row.status === "in_progress") {
      current.inProgress += 1;
    }

    acc[row.lesson_id] = current;
    return acc;
  }, {});
}
