import { NextResponse } from "next/server";
import { z } from "zod";
import type { ProgressStatus } from "@shecancode/shared-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const progressPayloadSchema = z.object({
  lessonId: z.uuid(),
  lessonStepId: z.uuid(),
  status: z.enum(["in_progress", "completed"] satisfies [ProgressStatus, ProgressStatus]),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để lưu tiến độ." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = progressPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu tiến độ không hợp lệ." }, { status: 400 });
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
