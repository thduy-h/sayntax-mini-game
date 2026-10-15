import { createServerSupabaseClient } from "@/lib/supabase/server";

export type V2StepStatus = "completed" | "in_progress" | "not_started";

export type LessonV2ProgressMap = Record<string, V2StepStatus>;

/** Completed-step count per lesson slug. Slugs with zero completions are
 *  intentionally omitted (the UI treats missing entries as 0). */
export type LessonV2CompletionCounts = Record<string, number>;

interface LessonV2ProgressRow {
  step_id: string;
  status: V2StepStatus;
}

interface LessonV2SummaryRow {
  lesson_slug: string;
  status: V2StepStatus;
}

/**
 * Read the learner's progress for a V2 lesson as `{ stepId -> status }`.
 * Resilient by design: any auth / RLS / missing-table failure resolves to an
 * empty map so the lesson UI still loads (persistence becomes a no-op).
 */
export async function getLessonV2Progress(lessonSlug: string): Promise<LessonV2ProgressMap> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return {};

    const { data, error } = await supabase
      .from("lesson_v2_progress")
      .select("step_id, status")
      .eq("user_id", user.id)
      .eq("lesson_slug", lessonSlug)
      .returns<LessonV2ProgressRow[]>();

    if (error || !data) return {};

    return Object.fromEntries(data.map((row) => [row.step_id, row.status]));
  } catch {
    // Table missing, connection dropped, etc. — silently degrade.
    return {};
  }
}

/**
 * Aggregate completed-step counts for every lesson slug in a single query.
 * Used by the /lessons-v2 listing page to render "X/Y bước" chips. Same
 * resilience guarantee: failures (no auth, missing table, RLS) return an
 * empty map so the list page still renders.
 */
export async function getLessonV2CompletionSummary(): Promise<{ counts: LessonV2CompletionCounts; available: boolean }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { counts: {}, available: false };

    const { data, error } = await supabase
      .from("lesson_v2_progress")
      .select("lesson_slug, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .returns<LessonV2SummaryRow[]>();

    if (error || !data) return { counts: {}, available: false };

    const counts: LessonV2CompletionCounts = {};
    for (const row of data) {
      counts[row.lesson_slug] = (counts[row.lesson_slug] ?? 0) + 1;
    }
    return { counts, available: true };
  } catch {
    return { counts: {}, available: false };
  }
}

export async function getLessonV2CompletionCounts(): Promise<LessonV2CompletionCounts> {
  return (await getLessonV2CompletionSummary()).counts;
}
