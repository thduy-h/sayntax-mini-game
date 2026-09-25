import { NextResponse } from "next/server";
import { isSeedV2DatabaseLessonStep } from "@shecancode/lesson-engine";
import { observeRoute } from "@/lib/operations/logger";
import { z } from "zod";
import type { ProgressStatus } from "@shecancode/shared-types";
import { getAuthenticatedServerSupabase } from "@/lib/supabase/server";

const progressPayloadSchema = z.object({
  lessonId: z.uuid(),
  lessonStepId: z.uuid(),
  status: z.enum(["in_progress", "completed"] satisfies [ProgressStatus, ProgressStatus]),
});

export const POST = observeRoute("progress_write_failure", post);

async function post(request: Request) {
  const auth = await getAuthenticatedServerSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = auth;

  const json = await request.json().catch(() => null);
  const parsed = progressPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu tiến độ không hợp lệ." }, { status: 400 });
  }
  if (!isSeedV2DatabaseLessonStep(parsed.data.lessonId, parsed.data.lessonStepId)) {
    return NextResponse.json({ error: "Bài học hoặc bước học không tồn tại." }, { status: 400 });
  }

  const completedAt = parsed.data.status === "completed" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("progress")
    .upsert(
      {
        lesson_id: parsed.data.lessonId,
        lesson_step_id: parsed.data.lessonStepId,
        user_id: user.id,
        status: parsed.data.status,
        completed_at: completedAt,
      },
      { onConflict: "user_id,lesson_step_id" },
    )
    .select("lesson_step_id, status, completed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Không thể lưu tiến độ lúc này." }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}
