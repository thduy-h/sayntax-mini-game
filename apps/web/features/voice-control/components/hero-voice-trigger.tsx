"use client";

import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalCommand, type VoiceOperationalState } from "./global-command-context";

function stateBadge(state: VoiceOperationalState, isListening: boolean) {
  if (isListening) {
    return {
      label: "Đang nghe liên tục",
      className: "border-black bg-[#7df2c3] text-black animate-pulse",
    };
  }
  switch (state.kind) {
    case "requesting_permission":
      return {
        label: "Đang xin quyền micro",
        className: "border-black bg-[#fff0a8] text-black",
      };
    case "processing":
      return {
        label: "Đang xử lý...",
        className: "border-black bg-[#a8e6ff] text-black",
      };
    case "success":
      return {
        label: "Đã thực hiện",
        className: "border-black bg-[#c8f5d8] text-black",
      };
    case "unknown_command":
      return {
        label: "Chưa hiểu lệnh",
        className: "border-black bg-[#ffe4b5] text-black",
      };
    case "interrupted":
      return {
        label: "Voice gián đoạn",
        className: "border-black bg-[#ffd1dc] text-black",
      };
    case "stopped_by_user":
      return {
        label: "Đã dừng nghe",
        className: "border-black bg-[#f4f4f5] text-zinc-700",
      };
    case "idle":
    default:
      return {
        label: "Chưa bật micro",
        className: "border-black/30 bg-white text-zinc-800",
      };
  }
}

export function HeroVoiceTrigger() {
  const { speech, startVoice, stopVoice, operationalState } = useGlobalCommand();
  const isListening = speech.isListening;
  const badge = stateBadge(operationalState, isListening);

  return (
    <section
      aria-label="Khu vực thiết lập và điều khiển giọng nói"
      className="mt-2.5 sm:mt-3 rounded-2xl border-2 border-black bg-[#fffdf3] p-2.5 sm:p-3 text-black shadow-[3px_3px_0_#121212]"
    >
      {/* Top Header Row with Title, Badge, and Accessible Supporter/Learner Mic Control */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black text-sm shadow-[1.5px_1.5px_0_#121212] ${
              isListening ? "bg-[#7df2c3] text-black" : "bg-[#ff5f87] text-white"
            }`}
          >
            {isListening ? (
              <Volume2 className="h-4 w-4 text-emerald-950 animate-pulse shrink-0" />
            ) : (
              "🎙️"
            )}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-black bg-[#ffce47] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                Voice Hub
              </span>
              <h2 className="text-xs font-black uppercase tracking-wider text-black sm:text-sm">
                {isListening ? "SAYNTAX ĐANG NGHE BẠN" : "ĐIỀU KHIỂN BẰNG GIỌNG NÓI"}
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
              {isListening
                ? "Micro đang mở liên tục · Nói câu lệnh bất kỳ để điều khiển"
                : "Dành cho người hạn chế vận động tay · Nói tiếng Việt tự nhiên"}
            </p>
          </div>
        </div>

        {/* Compact accessible mic control & state badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wide shadow-[1px_1px_0_#121212] ${badge.className}`}
          >
            {badge.label}
          </span>

          <Button
            id="voice-activation"
            type="button"
            onClick={() => {
              if (isListening) {
                void stopVoice(true);
              } else {
                void startVoice();
              }
            }}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#121212] active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc] ${
              isListening ? "bg-white hover:bg-[#ffe4b5]" : "bg-[#ff5f87]"
            }`}
            aria-label={isListening ? "Dừng nghe điều khiển bằng giọng nói" : "Bật micro cho người học"}
            aria-pressed={isListening}
          >
            {isListening ? (
              <>
                <MicOff className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>Dừng nghe</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 shrink-0" />
                <span>Bật micro (Thiết lập)</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Supporter note when NOT listening */}
      {!isListening && (
        <div className="mt-2 rounded-xl border border-black/15 bg-white/90 px-2.5 py-1 text-xs leading-snug text-zinc-700">
          <span className="font-bold text-black">💡 Thiết lập ban đầu (Người hỗ trợ): </span>
          Bấm nút <strong className="font-black text-black">&ldquo;Bật micro (Thiết lập)&rdquo;</strong> ở trên và cấp quyền micro 1 lần duy nhất. Sau bước này, người học hoàn toàn có thể ra lệnh bằng giọng nói mà không cần người hỗ trợ can thiệp thêm.
        </div>
      )}

      {/* When ACTIVE: Quick command chips */}
      {isListening && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-black/15 bg-[#e7fff3] px-2.5 py-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black uppercase tracking-wider text-emerald-950 shrink-0 text-[10px]">
              Lệnh mở đầu:
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-black bg-white px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_#121212]" title="Mở danh sách bài học">
              <span className="text-[#ff5f87]">🎤</span> &ldquo;Học thử&rdquo;
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-black bg-white px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_#121212]" title="Vào thẳng bài 1">
              <span className="text-[#ff5f87]">🎤</span> &ldquo;Bài 1&rdquo;
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-black bg-white px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_#121212]" title="Mở bảng hướng dẫn chi tiết">
              <span className="text-[#ff5f87]">🎤</span> &ldquo;Trợ giúp&rdquo;
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-900 hidden sm:inline">
            Nói &ldquo;Trợ giúp&rdquo; để xem bảng lệnh
          </span>
        </div>
      )}

      {/* Live Feedback & Status Message */}
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-black/15 bg-white px-3 py-1 text-xs">
        <div className="min-w-0 truncate">
          {isListening && speech.interimTranscript ? (
            <span className="font-mono font-bold text-black">
              Đang nghe: <span className="underline decoration-[#ff5f87] decoration-2">&ldquo;{speech.interimTranscript}&rdquo;</span>
            </span>
          ) : operationalState.kind === "success" ? (
            <span className="font-bold text-emerald-900">✓ {operationalState.message}</span>
          ) : operationalState.kind === "unknown_command" ? (
            <span className="font-bold text-amber-900">⚠ {operationalState.message}</span>
          ) : operationalState.kind === "interrupted" ? (
            <span className="font-bold text-red-800">⚠ {operationalState.message}</span>
          ) : operationalState.kind === "stopped_by_user" ? (
            <span className="font-bold text-zinc-800">🛑 {operationalState.message}</span>
          ) : (
            <span className="text-zinc-600 truncate">{operationalState.message || "Sẵn sàng nhận lệnh"}</span>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-zinc-500 hidden sm:inline">
          {isListening ? 'Nói "Dừng nghe" để tắt' : 'Fallback: kéo thả Blockly'}
        </span>
      </div>
    </section>
  );
}
