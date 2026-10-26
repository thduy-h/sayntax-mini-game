"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalCommand } from "./global-command-context";
import { isWorkspaceVoiceRoute } from "../utils/global-voice-routes";
import {
  conciseAnnouncement,
  distinctAnnouncement,
  speechStatusAnnouncement,
  type SpeechAnnouncementState,
} from "../utils/accessible-announcements";
import {
  VOICE_PROCESSING_DISCLOSURE,
} from "../utils/voice-privacy";

type EngineDisplayStatus =
  | "unstarted"
  | "starting"
  | "listening"
  | "processing"
  | "executed"
  | "unrecognized"
  | "error";

export function GlobalVoiceControl() {
  const pathname = usePathname();
  const uniqueId = useId();
  const {
    speech,
    startVoice,
    stopVoice,
    hasStartedVoice,
    userExplicitlyStopped,
    voicePrivacyAcknowledged,
    acknowledgePrivacy,
    lastResult,
    lastResultId,
    workspace,
  } = useGlobalCommand();

  const [expanded, setExpanded] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkExpanded = () => {
      if (window.location.hash === "#voice-expanded" || new URLSearchParams(window.location.search).get("voice") === "expanded") {
        setExpanded(true);
      }
    };
    checkExpanded();
    window.addEventListener("hashchange", checkExpanded);
    return () => window.removeEventListener("hashchange", checkExpanded);
  }, []);
  const [announcement, setAnnouncement] = useState({ id: 0, text: "" });
  const previousSpeechStatusRef = useRef<SpeechAnnouncementState | null>(null);
  const previousFeedbackRef = useRef<string | null>(null);
  const previousResultIdRef = useRef<number>(0);
  const lastAnnouncementRef = useRef("");

  const inWorkspace = isWorkspaceVoiceRoute(pathname) || Boolean(workspace);

  // Screen reader announcer
  const announce = useCallback((message: string | null, repeatEvent = false) => {
    const next = distinctAnnouncement(lastAnnouncementRef.current, message, repeatEvent);
    if (!next) return;
    lastAnnouncementRef.current = next;
    setAnnouncement((current) => ({ id: current.id + 1, text: next }));
  }, []);


  // Announce speech connection status changes
  useEffect(() => {
    const current: SpeechAnnouncementState = {
      errorMessage: speech.errorMessage,
      isListening: speech.isListening,
      isSupportKnown: speech.isSupportKnown,
      isSupported: speech.isSupported,
    };
    const message = speechStatusAnnouncement(
      previousSpeechStatusRef.current,
      current,
      "Bạn có thể kéo thả khối hoặc bấm Bật micro để thử lại.",
    );
    announce(message);
    previousSpeechStatusRef.current = current;
  }, [announce, speech.errorMessage, speech.isListening, speech.isSupportKnown, speech.isSupported]);

  // Announce executed command outcomes
  useEffect(() => {
    const feedback = lastResult?.feedback ?? "";
    const commandChanged = lastResultId !== previousResultIdRef.current;
    if (feedback && (feedback !== previousFeedbackRef.current || commandChanged)) {
      announce(conciseAnnouncement(feedback), commandChanged);
      previousFeedbackRef.current = feedback;
      previousResultIdRef.current = lastResultId;
    }
  }, [announce, lastResult, lastResultId]);

  // Listen to open-global-voice custom event (e.g. from skip links or hotkeys)
  useEffect(() => {
    const handleOpen = () => {
      setExpanded(true);
      // Opening the HUD must not grant microphone consent implicitly. The
      // explicit disclosure action below is the only path that acknowledges
      // processing and starts recognition for a new user.
      if (!speech.isListening && voicePrivacyAcknowledged) {
        void startVoice();
      }
    };
    window.addEventListener("scc:open-global-voice", handleOpen);
    return () => window.removeEventListener("scc:open-global-voice", handleOpen);
  }, [speech.isListening, startVoice, voicePrivacyAcknowledged]);

  // Determine true engine status matching 7 distinct states
  const engineStatus = useMemo<EngineDisplayStatus>(() => {
    // 1. Micro chưa kích hoạt (người dùng chưa kích hoạt hoặc đã chủ động dừng)
    if (!hasStartedVoice && !speech.isListening) {
      return "unstarted";
    }

    // 2. Lỗi microphone thật sự khi phiên đang diễn ra
    if (speech.errorMessage && (speech.isListening || speech.isStarting || userExplicitlyStopped === false)) {
      return "error";
    }

    // 3. Đã tắt hoặc chưa kích hoạt
    if (!speech.isListening && !speech.isStarting) {
      if (speech.errorMessage) return "error";
      return "unstarted";
    }

    // 4. Đang khởi động
    if (speech.isStarting || (speech.isListening && speech.asrState === "starting")) {
      return "starting";
    }

    // 5. Đang xử lý
    if (speech.asrState === "processing") {
      return "processing";
    }

    // 6. Đang nghe (hoặc vừa thực hiện / không hiểu)
    if (speech.isListening) {
      if (speech.interimTranscript) {
        return "listening";
      }
      if (lastResult) {
        return lastResult.handled ? "executed" : "unrecognized";
      }
      return "listening";
    }

    return "unstarted";
  }, [
    hasStartedVoice,
    lastResult,
    speech.asrState,
    speech.errorMessage,
    speech.interimTranscript,
    speech.isListening,
    speech.isStarting,
    userExplicitlyStopped,
  ]);

  // Status visual attributes
  const statusMeta = useMemo(() => {
    switch (engineStatus) {
      case "unstarted":
        return {
          label: "Chưa bật",
          dotColor: "bg-zinc-400",
          badgeClass: "border-black/30 bg-zinc-100 text-zinc-700",
          desc: userExplicitlyStopped
            ? "Đã dừng nghe. Bấm Bật micro khi muốn tiếp tục."
            : "Micro chưa được kích hoạt. Bấm Bật micro để bắt đầu.",
          icon: <MicOff className="h-4 w-4 text-zinc-500 shrink-0" />,
          iconBg: "bg-zinc-100",
          compactText: "Chưa bật micro",
        };
      case "starting":
        return {
          label: "Đang khởi động",
          dotColor: "bg-[#fff0a8]",
          badgeClass: "border-black bg-[#fff0a8] text-black",
          desc: "Đang chuẩn bị microphone và kết nối...",
          icon: <Loader2 className="h-4 w-4 text-amber-950 animate-spin motion-reduce:animate-none shrink-0" />,
          iconBg: "bg-[#fff0a8]",
          compactText: "Đang khởi động micro...",
        };
      case "listening":
        return {
          label: "Đang nghe",
          dotColor: "bg-[#7df2c3]",
          badgeClass: "border-black bg-[#7df2c3] text-black",
          desc: speech.interimTranscript
            ? `Đang nghe: “${speech.interimTranscript}”`
            : "Micro đang mở · Sẵn sàng tiếp nhận lời nói",
          icon: <Volume2 className="h-4 w-4 text-emerald-950 animate-pulse motion-reduce:animate-none shrink-0" />,
          iconBg: "bg-[#7df2c3]",
          compactText: speech.interimTranscript
            ? `“${speech.interimTranscript}”`
            : "Sẵn sàng tiếp nhận lời nói",
        };
      case "processing":
        return {
          label: "Đang xử lý",
          dotColor: "bg-[#a8e6ff]",
          badgeClass: "border-black bg-[#a8e6ff] text-black",
          desc: `Đang nhận dạng hoặc thực hiện lệnh: “${speech.transcript || "..."}”`,
          icon: <Loader2 className="h-4 w-4 text-blue-950 animate-spin motion-reduce:animate-none shrink-0" />,
          iconBg: "bg-[#a8e6ff]",
          compactText: speech.transcript ? `Đang xử lý: “${speech.transcript}”` : "Đang xử lý lệnh...",
        };
      case "executed":
        return {
          label: "Đã thực hiện",
          dotColor: "bg-[#7df2c3]",
          badgeClass: "border-black bg-[#7df2c3] text-black",
          desc: lastResult?.feedback ?? "Lệnh được xử lý thành công.",
          icon: <Check className="h-4 w-4 text-emerald-950 shrink-0" />,
          iconBg: "bg-[#7df2c3]",
          compactText: `✓ ${lastResult?.understoodAs ?? lastResult?.feedback ?? "Thành công"}`,
        };
      case "unrecognized":
        return {
          label: "Không hiểu lệnh",
          dotColor: "bg-[#ffce47]",
          badgeClass: "border-black bg-[#ffce47] text-black",
          desc: lastResult?.feedback ?? "Đã nghe được nhưng chưa xác định được yêu cầu.",
          icon: <HelpCircle className="h-4 w-4 text-black shrink-0" />,
          iconBg: "bg-[#ffce47]",
          compactText: `⚠ ${lastResult?.feedback ?? "Chưa hiểu câu lệnh"}`,
        };
      case "error":
      default:
        return {
          label: "Lỗi microphone",
          dotColor: "bg-[#ffd1dc]",
          badgeClass: "border-black bg-[#ffd1dc] text-red-950",
          desc: speech.errorMessage || "Không thể truy cập microphone. Kiểm tra thiết bị và quyền trình duyệt.",
          icon: <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />,
          iconBg: "bg-[#ffd1dc]",
          compactText: speech.errorMessage || "Lỗi truy cập microphone",
        };
    }
  }, [
    engineStatus,
    lastResult,
    speech.errorMessage,
    speech.interimTranscript,
    speech.transcript,
    userExplicitlyStopped,
  ]);

  // Context page label
  const pageContextLabel = workspace?.lessonTitle
    ? `Bài học: ${workspace.lessonTitle}`
    : pathname === "/"
      ? "Trang chủ"
      : pathname?.startsWith("/demo")
        ? "Trang trải nghiệm (Demo)"
        : pathname?.startsWith("/lessons-v2")
          ? "Danh sách bài học"
          : pathname === "/privacy"
            ? "Chính sách quyền riêng tư"
            : pathname || "SAYNTAX";

  const start = async () => {
    if (!voicePrivacyAcknowledged) {
      setExpanded(true);
    }
    if (!voicePrivacyAcknowledged) return;
    await startVoice();
  };

  const handleToggleVoice = async () => {
    if (speech.isListening) {
      await stopVoice(true);
    } else {
      await start();
    }
  };

  const handleAcknowledgeAndStart = async () => {
    acknowledgePrivacy();
    await startVoice();
  };

  return (
    <div
      ref={hudRef}
      data-global-voice-hud
      className={`fixed z-[var(--z-global-voice)] pointer-events-auto right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:right-4 sm:bottom-4 ${expanded
        ? "w-[calc(100vw-1.5rem)] sm:w-[min(26rem,calc(100vw-2rem))]"
        : "w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-[460px]"
      }`}
      style={{ marginBottom: "var(--global-command-bar-height, 0px)" }}
    >
      {/* Accessible aria-live screen-reader announcement */}
      <p aria-atomic="true" className="sr-only" role="status"><span key={announcement.id}>{announcement.text}</span></p>

      {/* COMPACT MODE */}
      {!expanded ? (
        <div
          role="region"
          aria-label="Thanh điều khiển và trạng thái giọng nói toàn cục"
          className="flex items-center justify-between gap-2 rounded-2xl border-2 border-black bg-white px-3 py-2 text-black shadow-[4px_4px_0_#121212] sm:px-3.5 sm:py-2.5"
        >
          {/* Status Badge & Icon */}
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-black shadow-[1.5px_1.5px_0_#121212] ${statusMeta.iconBg}`}
            >
              {statusMeta.icon}
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold text-zinc-500 truncate max-w-[110px]">
                  {pageContextLabel}
                </span>
              </div>

              {/* Dynamic Transcript / Latest Outcome in Compact Mode */}
              <div className="mt-0.5 min-w-0 max-w-[190px] sm:max-w-[230px] text-xs font-semibold truncate">
                {statusMeta.compactText}
              </div>
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              id="voice-activation"
              size="sm"
              type="button"
              onClick={handleToggleVoice}
              disabled={speech.isStarting}
              aria-label={speech.isListening ? "Dừng nghe micro" : "Bật micro cho người học"}
              aria-pressed={speech.isListening}
              className={`inline-flex min-h-11 min-w-11 items-center gap-1 rounded-xl border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc] ${
                speech.isListening ? "bg-[#ffe4b5] hover:bg-[#ffd1dc]" : "bg-[#ff5f87] hover:bg-[#ff7aa0]"
              }`}
            >
              {speech.isListening ? (
                <>
                  <MicOff className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="hidden xs:inline">Dừng</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden xs:inline">Bật</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setExpanded(true)}
              aria-label="Mở rộng chi tiết trạng thái giọng nói"
              aria-expanded="false"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-black bg-white p-0 text-black shadow-[2px_2px_0_#121212] hover:bg-zinc-100 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* EXPANDED MODE */
        <section
          role="dialog"
          aria-label="Bảng điều khiển và theo dõi giọng nói toàn cục"
          className="max-h-[80dvh] overflow-y-auto rounded-3xl border-3 border-black bg-[#fffdf3] p-3.5 sm:p-4 text-black shadow-[6px_6px_0_#121212]"
          style={{
            maxHeight: "min(80dvh, calc(100dvh - var(--global-command-bar-height, 0px) - 2rem))",
          }}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black shadow-[1.5px_1.5px_0_#121212] ${statusMeta.iconBg}`}
              >
                {statusMeta.icon}
              </span>
              <div>
                <p className="font-heading text-xs font-black uppercase tracking-wider text-black">
                  Điều khiển giọng nói
                </p>
                <p className="text-[11px] font-medium text-zinc-600 truncate max-w-[200px] sm:max-w-[260px]">
                  {pageContextLabel}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setExpanded(false)}
              aria-label="Thu gọn bảng điều khiển giọng nói"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-black bg-white p-0 text-black shadow-[2px_2px_0_#121212] hover:bg-zinc-100 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Privacy Disclosure Warning (if unacknowledged) */}
          {!voicePrivacyAcknowledged && (
            <div className="mt-3 rounded-2xl border-2 border-black bg-[#fff6a8] p-3 text-xs shadow-[2px_2px_0_#121212]">
              <p className="font-bold text-black">💡 Cấp quyền sử dụng giọng nói:</p>
              <p className="mt-1 leading-relaxed text-zinc-800">{VOICE_PROCESSING_DISCLOSURE}</p>
              <Button
                type="button"
                onClick={handleAcknowledgeAndStart}
                className="mt-2.5 w-full rounded-xl border-2 border-black bg-[#ff5f87] text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212] hover:bg-[#ff7aa0]"
              >
                Đồng ý &amp; Bật micro
              </Button>
            </div>
          )}

          {/* Primary Status Card */}
          <div className="mt-3 rounded-2xl border-2 border-black bg-white p-3 shadow-[2px_2px_0_#121212]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Trạng thái micro
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-[1px_1px_0_#121212] ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-700 leading-snug">
              {statusMeta.desc}
            </p>
          </div>

          {/* Activity Tracking: Concrete Chain */}
          <div className="mt-3 rounded-2xl border-2 border-black bg-white p-3 shadow-[2px_2px_0_#121212] space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-black/10 pb-1">
              Hoạt động &amp; Kết quả lệnh
            </p>

            {/* Live interim transcript (if user speaking right now) */}
            {speech.interimTranscript && (
              <div className="rounded-xl border border-blue-400 bg-[#e0f2fe] p-2 text-xs">
                <span className="font-bold text-blue-950">Đang nghe: </span>
                <span className="font-mono font-bold text-black">&ldquo;{speech.interimTranscript}&rdquo;</span>
              </div>
            )}

            {/* Last Execution Outcome Chain */}
            {lastResult ? (
              <div className="space-y-1.5 text-xs">
                {/* 1. Spoken Transcript */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 shrink-0">Câu đã nghe:</span>
                  <span className="rounded bg-[#ffe0eb] border border-black/20 px-1.5 py-0.5 font-mono text-xs font-black text-black">
                    &ldquo;{lastResult.command}&rdquo;
                  </span>
                </div>

                {/* 2. Recognized Intent */}
                {lastResult.understoodAs && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-500 shrink-0">Ý định hiểu:</span>
                    <span className="font-bold text-black">{lastResult.understoodAs}</span>
                  </div>
                )}

                {/* 3. Concrete Result Feedback */}
                <div
                  className={`mt-1 flex items-start gap-1.5 rounded-xl border p-2 ${
                    lastResult.handled
                      ? "border-emerald-600 bg-[#d1fae5] text-emerald-950"
                      : "border-amber-500 bg-[#fef3c7] text-amber-950"
                  }`}
                >
                  <span className="font-black mt-0.5 shrink-0">
                    {lastResult.handled ? "✓" : "⚠"}
                  </span>
                  <div>
                    <span className="font-black uppercase tracking-wider text-[10px] block">
                      {lastResult.handled ? "Thành công" : "Chưa thực hiện được"}
                    </span>
                    <span className="font-medium text-xs leading-snug">
                      {lastResult.feedback}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                Chưa có câu lệnh nào được thực thi trong phiên này.
              </p>
            )}
          </div>

          {/* Errors & Recovery Tips */}
          {speech.errorMessage && (
            <div className="mt-3 rounded-2xl border-2 border-red-600 bg-[#ffd1dc] p-3 text-xs text-red-950 shadow-[2px_2px_0_#121212]">
              <div className="flex items-center gap-1.5 font-black">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Gặp sự cố kết nối micro:</span>
              </div>
              <p className="mt-1 leading-snug">{speech.errorMessage}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void speech.retryASR()}
                  className="rounded-lg border-2 border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[1.5px_1.5px_0_#121212]"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Thử lại nhận dạng
                </Button>
              </div>
            </div>
          )}

          {/* Microphone Selector & Technical Controls (For Supporters) */}
          <div className="mt-3 rounded-2xl border-2 border-black bg-white p-3 shadow-[2px_2px_0_#121212] space-y-2">
            <label
              htmlFor={`${uniqueId}-mic-select`}
              className="text-[10px] font-black uppercase tracking-wider text-black block"
            >
              Chọn thiết bị Microphone
            </label>
            <select
              id={`${uniqueId}-mic-select`}
              aria-label="Chọn microphone để thu âm giọng nói"
              className="block w-full min-h-9 rounded-xl border-2 border-black bg-white px-2.5 py-1 text-xs font-semibold text-black focus-visible:outline-4 focus-visible:outline-[#0052cc]"
              disabled={speech.isListening || speech.isStarting}
              onChange={(e) => speech.selectMicrophone(e.target.value)}
              onFocus={() => {
                void speech.refreshMicrophones();
              }}
              value={speech.selectedMicrophoneId}
            >
              <option value="">Microphone mặc định của hệ thống</option>
              {speech.audioInputs.map((input) => (
                <option key={input.deviceId || input.label} value={input.deviceId}>
                  {input.label || `Microphone (${input.deviceId.slice(0, 8)})`}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Command Suggestions based on current context */}
          <div className="mt-3 rounded-2xl border-2 border-black bg-[#fff6fb] p-3 shadow-[2px_2px_0_#121212]">
            <div className="flex items-center gap-1.5 border-b border-black/10 pb-1">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-black">
                {inWorkspace ? "Lệnh mẫu trong bài học" : "Lệnh mẫu trên website"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {inWorkspace ? (
                <>
                  {["Thêm khối bắt đầu", "Thêm khối in", "Chạy", "Hoàn tác", "Trợ giúp", "Dừng nghe"].map((cmd) => (
                    <span
                      key={cmd}
                      className="rounded-md border border-black/20 bg-white px-2 py-0.5 font-mono text-[11px] font-black text-black shadow-[1px_1px_0_#121212]"
                    >
                      &ldquo;{cmd}&rdquo;
                    </span>
                  ))}
                </>
              ) : (
                <>
                  {["Học thử", "Bài 1", "Cuộn xuống", "Về đầu trang", "Trợ giúp", "Dừng nghe"].map((cmd) => (
                    <span
                      key={cmd}
                      className="rounded-md border border-black/20 bg-white px-2 py-0.5 font-mono text-[11px] font-black text-black shadow-[1px_1px_0_#121212]"
                    >
                      &ldquo;{cmd}&rdquo;
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Primary Action Button (Supporter initial setup / Learner toggle) */}
          <div className="mt-3 pt-2 flex items-center justify-between gap-2 border-t border-black/10">
            <Button
              type="button"
              onClick={handleToggleVoice}
              disabled={speech.isStarting}
              className={`w-full min-h-10 rounded-xl border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc] ${
                speech.isListening
                  ? "bg-[#ffe4b5] hover:bg-[#ffd1dc]"
                  : "bg-[#7df2c3] hover:bg-[#9af7d0]"
              }`}
            >
              {speech.isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4 text-red-600 shrink-0" />
                  Dừng nghe điều khiển giọng nói
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4 shrink-0" />
                  Bật micro (Bắt đầu điều khiển)
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
