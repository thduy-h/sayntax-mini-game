import { NextResponse } from "next/server";
import { isSeedV2DatabaseLessonStep } from "@shecancode/lesson-engine";
import { observeRoute } from "@/lib/operations/logger";
import { z } from "zod";
import { getAuthenticatedServerSupabase } from "@/lib/supabase/server";

const programPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  lessonStepId: z.string().uuid(),
  workspaceState: z.unknown(),
});

const searchParamsSchema = z.object({
  lessonStepId: z.string().uuid(),
});

export async function GET(request: Request) {
  const auth = await getAuthenticatedServerSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = auth;

  const requestUrl = new URL(request.url);
  const parsed = searchParamsSchema.safeParse({
    lessonStepId: requestUrl.searchParams.get("lessonStepId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu lessonStepId hợp lệ." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("programs")
    .select("id, workspace_state, updated_at")
    .eq("user_id", user.id)
    .eq("lesson_step_id", parsed.data.lessonStepId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Không thể tải bài làm đã lưu." }, { status: 500 });
  }

  return NextResponse.json({
    program: data
      ? {
          id: data.id,
          updatedAt: data.updated_at,
          workspaceState: data.workspace_state,
        }
      : null,
  });
}

export const POST = observeRoute("program_save_failure", post);

async function post(request: Request) {
  const auth = await getAuthenticatedServerSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = auth;

  const json = await request.json().catch(() => null);
  const parsed = programPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu workspace không hợp lệ." }, { status: 400 });
  }
  if (!isSeedV2DatabaseLessonStep(parsed.data.lessonId, parsed.data.lessonStepId)) {
    return NextResponse.json({ error: "Bài học hoặc bước học không tồn tại." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("programs")
    .upsert(
      {
        lesson_id: parsed.data.lessonId,
        lesson_step_id: parsed.data.lessonStepId,
        user_id: user.id,
        workspace_state: parsed.data.workspaceState,
      },
      { onConflict: "user_id,lesson_step_id" },
    )
    .select("id, workspace_state, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Không thể lưu workspace lúc này." }, { status: 500 });
  }

  return NextResponse.json({
    program: {
      id: data.id,
      updatedAt: data.updated_at,
      workspaceState: data.workspace_state,
    },
  });
}
