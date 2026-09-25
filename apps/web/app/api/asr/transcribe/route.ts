import { handleASRTranscription } from "@/lib/asr/transcribe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleASRTranscription(request);
}
