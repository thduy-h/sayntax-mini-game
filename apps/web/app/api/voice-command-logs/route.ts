import { NextResponse } from "next/server";
import { isSeedV2DatabaseLessonStep } from "@shecancode/lesson-engine";
import { observeRoute } from "@/lib/operations/logger";
import { z } from "zod";
import type { VoiceCommandStatus } from "@shecancode/shared-types";
import { getAuthenticatedServerSupabase } from "@/lib/supabase/server";

const parsedActionSchema = z.object({
  type: z.string(),
}).passthrough();

const voiceLogPayloadSchema = z.object({
  lessonId: z.uuid(),
  lessonStepId: z.uuid(),
  transcript: z.string().trim().min(1),
  normalizedTranscript: z.string().trim().min(1),
  parsedAction: parsedActionSchema,
  status: z.enum(["success", "unsupported", "error"] satisfies [VoiceCommandStatus, VoiceCommandStatus, VoiceCommandStatus]),
  failureReason: z.string().trim().min(1).nullable().optional(),
});

export const POST = observeRoute("voice_log_failure", post);

async function post(request: Request) {
  const auth = await getAuthenticatedServerSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = auth;

  const json = await request.json().catch(() => null);
  const parsed = voiceLogPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu nhật ký giọng nói không hợp lệ." }, { status: 400 });
  }
  if (!isSeedV2DatabaseLessonStep(parsed.data.lessonId, parsed.data.lessonStepId)) {
    return NextResponse.json({ error: "Bài học hoặc bước học không tồn tại." }, { status: 400 });
  }

  const { error } = await supabase.from("voice_command_logs").insert({
    failure_reason: parsed.data.failureReason ?? null,
    lesson_id: parsed.data.lessonId,
    lesson_step_id: parsed.data.lessonStepId,
    normalized_transcript: parsed.data.normalizedTranscript,
    parsed_action: parsed.data.parsedAction,
    status: parsed.data.status,
    transcript: parsed.data.transcript,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: "Không thể lưu nhật ký giọng nói lúc này." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
