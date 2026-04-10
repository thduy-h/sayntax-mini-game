import { NextResponse } from "next/server";
import { z } from "zod";
import type { VoiceCommandStatus } from "@shecancode/shared-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để lưu nhật ký giọng nói." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = voiceLogPayloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu nhật ký giọng nói không hợp lệ." }, { status: 400 });
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
