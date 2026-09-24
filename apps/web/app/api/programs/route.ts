import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const programPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  lessonStepId: z.string().uuid(),
  workspaceState: z.unknown(),
});

const searchParamsSchema = z.object({
  lessonStepId: z.string().uuid(),
});

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = programPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu workspace không hợp lệ." }, { status: 400 });
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
