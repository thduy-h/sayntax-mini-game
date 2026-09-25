import { NextResponse } from "next/server";
import { isSeedV2DatabaseLessonStep } from "@shecancode/lesson-engine";
import { logOperation, observeRoute } from "@/lib/operations/logger";
import { z } from "zod";
import { getAuthenticatedServerSupabase } from "@/lib/supabase/server";

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

export const POST = observeRoute("program_run_failure", post);

async function post(request: Request) {
  const auth = await getAuthenticatedServerSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = auth;

  const json = await request.json().catch(() => null);
  const parsed = programRunPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu chạy chương trình không hợp lệ." }, { status: 400 });
  }
  if (!isSeedV2DatabaseLessonStep(parsed.data.lessonId, parsed.data.lessonStepId)) {
    return NextResponse.json({ error: "Bài học hoặc bước học không tồn tại." }, { status: 400 });
  }

  if (!parsed.data.executionResult.success) {
    logOperation("program_run_failure", { phase: "validation" });
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
    logOperation("program_save_failure", { phase: "persistence" });
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
