"use server";

import { isSeedV2LessonStep } from "@shecancode/lesson-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logOperation } from "@/lib/operations/logger";

/**
 * Upsert a completed step into `lesson_v2_progress`. Fire-and-forget from
 * the UI — errors are swallowed so that offline mode / RLS misconfig / a
 * missing migration never blocks the learner.
 *
 * The unique `(user_id, lesson_slug, step_id)` constraint means repeated
 * passes on the same step are idempotent: we upsert with onConflict.
 */
export async function markLessonV2StepCompletedAction(
  lessonSlug: string,
  stepId: string,
): Promise<{ ok: boolean }> {
  try {
    if (!isSeedV2LessonStep(lessonSlug, stepId)) {
      logOperation("progress_write_failure", { phase: "validation" });
      return { ok: false };
    }
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logOperation("auth_failure", { phase: "session" });
      return { ok: false };
    }

    const { error } = await supabase.from("lesson_v2_progress").upsert(
      {
        user_id: user.id,
        lesson_slug: lessonSlug,
        step_id: stepId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_slug,step_id" },
    );

    if (error) {
      logOperation("progress_write_failure", { phase: "persistence" });
      return { ok: false };
    }
    return { ok: true };
  } catch {
    logOperation("progress_write_failure", { phase: "unexpected" });
    return { ok: false };
  }
}
