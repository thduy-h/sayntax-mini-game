import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const executionResultSchema = z.object({
  errors: z.array(z.string()),
  output: z.array(z.string()),
  success: z.boolean(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

const programRunPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  lessonStepId: z.string().uuid(),
  workspaceState: z.unknown(),
  executionResult: executionResultSchema,
});

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = programRunPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu chạy chương trình không hợp lệ." }, { status: 400 });
  }

  const { data: program, error: programError } = await supabase
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
    .select("id")
    .single();

  if (programError || !program) {
    return NextResponse.json({ error: "Không thể lưu workspace trước khi chạy." }, { status: 500 });
  }

  const { data: run, error: runError } = await supabase
    .from("program_runs")
    .insert({
      program_id: program.id,
      user_id: user.id,
      lesson_id: parsed.data.lessonId,
      lesson_step_id: parsed.data.lessonStepId,
      status: parsed.data.executionResult.success ? "success" : "error",
      success: parsed.data.executionResult.success,
      execution_result: parsed.data.executionResult,
      error_message: parsed.data.executionResult.errors[0] ?? null,
    })
    .select("id, status, created_at")
    .single();

  if (runError) {
    return NextResponse.json({ error: "Không thể lưu lịch sử chạy chương trình." }, { status: 500 });
  }

  return NextResponse.json({
    run: {
      createdAt: run.created_at,
      id: run.id,
      status: run.status,
    },
  });
}
