"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGlobalCommand } from "@/features/voice-control/components/global-command-context";
import { parseGlobalVoiceCommand } from "@/features/voice-control/utils/global-voice-control";
import {
  progressAfterSuccess,
  completeGuidance,
  guidanceSuccessForResult,
  readGuidanceProgress,
  reopenGuidance,
  skipGuidance,
  writeGuidanceProgress,
  type GuidanceProgress,
} from "../utils/guidance-progress";

function browserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function saveProgress(next: GuidanceProgress) {
  writeGuidanceProgress(browserStorage(), next);
}

export function FirstTimeGuidance() {
  const {
    lastResult,
    lastResultId,
    speech,
  } = useGlobalCommand();
  const [progress, setProgress] = useState<GuidanceProgress | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackIsSuccess, setFeedbackIsSuccess] = useState(false);
  const processedResultIdRef = useRef(0);
  const replayFocusRef = useRef(false);
  const skippedFocusRef = useRef(false);
  const completedFocusRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (progress?.status === "active" && replayFocusRef.current) {
      replayFocusRef.current = false;
      headingRef.current?.focus({ preventScroll: true });
    } else if (progress?.status === "skipped" && skippedFocusRef.current) {
      skippedFocusRef.current = false;
      headingRef.current?.focus({ preventScroll: true });
    } else if (progress?.status === "completed" && completedFocusRef.current) {
      completedFocusRef.current = false;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [progress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.queueMicrotask(() => setProgress(readGuidanceProgress(browserStorage())));
  }, []);

  useEffect(() => {
    if (!progress || !lastResult || lastResultId === 0 || lastResultId === processedResultIdRef.current) return;
    processedResultIdRef.current = lastResultId;

    const isWebsiteResult = lastResult.target === "website";
    const success = guidanceSuccessForResult(progress, lastResult, parseGlobalVoiceCommand);

    if (success === "help") {
      const next = progressAfterSuccess(progress, "help");
      window.queueMicrotask(() => {
        setProgress(next);
        saveProgress(next);
        setFeedback("Đã mở hướng dẫn. Tiếp theo, hãy thử nói “Cuộn xuống”.");
        setFeedbackIsSuccess(true);
      });
      return;
    }
    if (success === "scroll") {
      const next = progressAfterSuccess(progress, "scroll");
      window.queueMicrotask(() => {
        setProgress(next);
        saveProgress(next);
        setFeedback("Đã cuộn trang thành công! Bạn đã sẵn sàng để học lập trình.");
        setFeedbackIsSuccess(true);
        window.dispatchEvent(new CustomEvent("scc:guidance-ready", { detail: { resultId: lastResultId } }));
      });
      return;
    }
    if (success === "demo") {
      const next = progressAfterSuccess(progress, "demo");
      window.queueMicrotask(() => {
        setProgress(next);
        saveProgress(next);
      });
      return;
    }

    if (progress.status !== "active") return;

    if (isWebsiteResult && !lastResult.handled) {
      window.queueMicrotask(() => {
        setFeedback(lastResult.feedback);
        setFeedbackIsSuccess(false);
      });
    } else if (isWebsiteResult && !(progress.stage === 2 && parseGlobalVoiceCommand(lastResult.command).kind === "help")) {
      window.queueMicrotask(() => {
        setFeedback("Lệnh đã được thực hiện. Hãy thử câu lệnh gợi ý để tiếp tục hướng dẫn.");
        setFeedbackIsSuccess(false);
      });
    }
  }, [lastResult, lastResultId, progress]);

  if (!progress) return null;

  const replay = () => {
    processedResultIdRef.current = lastResultId;
    replayFocusRef.current = true;
    const next = reopenGuidance(progress);
    setProgress(next);
    saveProgress(next);
    setFeedback("");
    setFeedbackIsSuccess(false);
  };

  const skip = () => {
    skippedFocusRef.current = true;
    const next = skipGuidance(progress);
    setProgress(next);
    saveProgress(next);
    setFeedback("");
    setFeedbackIsSuccess(false);
  };

  const complete = () => {
    completedFocusRef.current = true;
    const next = completeGuidance(progress);
    setProgress(next);
    saveProgress(next);
    setFeedback("");
    setFeedbackIsSuccess(false);
  };

  const voiceStatus = speech.isListening
    ? "Micro đang nghe. Hãy nói câu lệnh mẫu bên dưới."
    : speech.isStarting
      ? "Đang kết nối micro…"
      : speech.errorMessage
        ? `Micro chưa sẵn sàng: ${speech.errorMessage}`
        : "Micro chưa được kích hoạt. Người hỗ trợ có thể mở bảng điều khiển để cấp quyền một lần.";

  const openVoicePanel = () => {
    window.dispatchEvent(new CustomEvent("scc:open-global-voice"));
  };

  // TRẠNG THÁI 2 — ĐÃ HOÀN THÀNH HOẶC BỎ QUA (BẢNG HƯỚNG DẪN NHANH)
  if (progress.status !== "active") {
    return (
      <section
        id="first-time-guidance"
        data-guidance-panel
        data-guidance-status={progress.status}
        data-guidance-stage={progress.stage}
        aria-labelledby="first-time-guidance-title"
        className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fffdf0] p-6 sm:p-7 shadow-[4px_4px_0_#121212]"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
            <p className="font-heading text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
              Hướng dẫn nhanh
            </p>
            {progress.status === "completed" ? (
              <span className="rounded border border-black bg-[#7df2c3] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_#121212]">
                Đã hoàn thành
              </span>
            ) : (
              <span className="rounded border border-black bg-[#ffce47] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_#121212]">
                Lệnh giọng nói
              </span>
            )}
          </div>

          <div className="mt-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              id="first-time-guidance-title"
              className="font-heading text-xl sm:text-2xl font-black text-black tracking-tight uppercase leading-snug"
            >
              BẠN CÓ THỂ NÓI GÌ VỚI SAYNTAX?
            </h2>

            <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-zinc-800">
              SAYNTAX cho phép bạn điều hướng website rảnh tay bằng các khẩu lệnh tiếng Việt ngắn gọn mà không cần dùng chuột hay bàn phím.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-black/15 bg-white/80 p-2.5 sm:p-3 shadow-[1px_1px_0_#121212]">
                <span className="inline-block whitespace-nowrap rounded-lg border border-black bg-white px-2.5 py-1 font-mono text-xs sm:text-sm font-black text-black shadow-[1px_1px_0_#121212] shrink-0">
                  &ldquo;Trợ giúp&rdquo;
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-800">
                  Mở hướng dẫn
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border-2 border-black/15 bg-white/80 p-2.5 sm:p-3 shadow-[1px_1px_0_#121212]">
                <span className="inline-block whitespace-nowrap rounded-lg border border-black bg-white px-2.5 py-1 font-mono text-xs sm:text-sm font-black text-black shadow-[1px_1px_0_#121212] shrink-0">
                  &ldquo;Cuộn xuống&rdquo;
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-800">
                  Di chuyển trang
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border-2 border-black/15 bg-white/80 p-2.5 sm:p-3 shadow-[1px_1px_0_#121212]">
                <span className="inline-block whitespace-nowrap rounded-lg border border-black bg-white px-2.5 py-1 font-mono text-xs sm:text-sm font-black text-black shadow-[1px_1px_0_#121212] shrink-0">
                  &ldquo;Học thử&rdquo;
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-800">
                  Khám phá bài học
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3.5">
          <button
            ref={replayRef}
            id="replay-first-time-guidance"
            data-guidance-status={progress.status}
            data-guidance-stage={progress.stage}
            type="button"
            onClick={replay}
            className="text-xs sm:text-sm font-black text-zinc-800 underline underline-offset-4 hover:text-black focus-visible:outline-4 focus-visible:outline-[#0052cc]"
          >
            Làm quen lại từ đầu
          </button>
          <Link
            href="/voice-guide"
            className="text-xs sm:text-sm font-black text-black underline underline-offset-4 hover:text-[#ff5f87] transition-colors focus-visible:outline-4 focus-visible:outline-[#0052cc]"
          >
            Xem toàn bộ câu lệnh →
          </Link>
        </div>
      </section>
    );
  }

  // TRẠNG THÁI 1 — NGƯỜI DÙNG MỚI (ONBOARDING 3 BƯỚC)
  return (
    <section
      id="first-time-guidance"
      data-guidance-panel
      data-guidance-status="active"
      data-guidance-stage={progress.stage}
      aria-labelledby="first-time-guidance-title"
      className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fffdf0] p-6 sm:p-7 shadow-[4px_4px_0_#121212]"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
          <p className="font-heading text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
            Làm quen với SAYNTAX
          </p>
          <span className="rounded border border-black bg-[#ffce47] px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0_#121212]">
            {progress.stage}/3
          </span>
        </div>

        <div className="mt-4">
          {progress.stage === 1 && (
            <>
              <h2
                ref={headingRef}
                tabIndex={-1}
                id="first-time-guidance-title"
                className="font-heading text-xl sm:text-2xl font-black text-black leading-snug"
              >
                Xin chào! Bạn có thể điều khiển SAYNTAX bằng giọng nói.
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-zinc-800">
                SAYNTAX giúp bạn học lập trình bằng lời nói hoặc kéo thả các khối lệnh. Khi micro đã được thiết lập, bạn có thể nói để điều khiển website.
              </p>
              <div className="mt-3 rounded-xl border border-black/15 bg-white/70 p-2.5 text-xs sm:text-sm font-medium text-zinc-800 leading-snug">
                <strong className="font-black text-black">Trạng thái hiện tại: </strong>
                {voiceStatus}
              </div>
              <p className="mt-3 text-xs sm:text-sm font-bold text-black">
                {speech.isListening ? "Hãy thử nói:" : "Khi micro đang nghe, hãy nói:"}{" "}
                <span className="inline-block whitespace-nowrap rounded-md border border-black bg-white px-2 py-0.5 font-mono shadow-[1px_1px_0_#121212]">
                  “Trợ giúp”
                </span>
              </p>
              <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-700">
                SAYNTAX sẽ mở hướng dẫn các câu lệnh bạn có thể sử dụng.
              </p>
              {!speech.isListening && (
                <button
                  type="button"
                  onClick={openVoicePanel}
                  className="mt-3 inline-flex min-h-10 items-center rounded-xl border-2 border-black bg-[#7df2c3] px-3.5 py-1.5 text-xs sm:text-sm font-black text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
                >
                  Mở trạng thái micro
                </button>
              )}
            </>
          )}

          {progress.stage === 2 && (
            <>
              <h2
                ref={headingRef}
                tabIndex={-1}
                id="first-time-guidance-title"
                className="font-heading text-xl sm:text-2xl font-black text-black leading-snug"
              >
                Bạn đã biết cách yêu cầu SAYNTAX trợ giúp!
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-zinc-800">
                Bây giờ hãy thử điều khiển website bằng một thao tác đơn giản.
              </p>
              <p className="mt-3 text-xs sm:text-sm font-bold text-black">
                Hãy nói:{" "}
                <span className="inline-block whitespace-nowrap rounded-md border border-black bg-white px-2 py-0.5 font-mono shadow-[1px_1px_0_#121212]">
                  “Cuộn xuống”
                </span>
              </p>
              <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-700">
                SAYNTAX sẽ di chuyển trang xuống dưới để bạn xem tiếp nội dung.
              </p>
            </>
          )}

          {progress.stage === 3 && (
            <>
              <h2
                ref={headingRef}
                tabIndex={-1}
                id="first-time-guidance-title"
                className="font-heading text-xl sm:text-2xl font-black text-black leading-snug"
              >
                Tuyệt vời! Bạn đã sẵn sàng học lập trình.
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-zinc-800">
                Bạn đã nắm được cách ra lệnh bằng giọng nói và điều khiển website SAYNTAX.
              </p>
              <p className="mt-3 text-xs sm:text-sm font-bold text-black">
                Hãy nói:{" "}
                <span className="inline-block whitespace-nowrap rounded-md border border-black bg-white px-2 py-0.5 font-mono shadow-[1px_1px_0_#121212]">
                  “Học thử”
                </span>
              </p>
              <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-700">
                để bắt đầu khám phá các bài học lập trình thực tế.
              </p>
            </>
          )}
        </div>

        <p
          role="status"
          aria-atomic="true"
          className={
            feedback || progress.stage === 2
              ? `mt-3.5 rounded-xl bg-white/80 p-2.5 text-xs sm:text-sm font-bold ${
                  feedbackIsSuccess || !feedback ? "text-emerald-950" : "text-amber-950"
                }`
              : "sr-only"
          }
        >
          {feedback || (progress.stage === 2 ? "Đã mở hướng dẫn. Tiếp theo, hãy thử nói “Cuộn xuống”." : "")}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3.5">
        {progress.stage < 3 ? (
          <button
            type="button"
            onClick={skip}
            className="min-h-10 rounded-xl text-xs font-black text-zinc-600 underline underline-offset-4 hover:text-black focus-visible:outline-4 focus-visible:outline-[#0052cc]"
          >
            Bỏ qua hướng dẫn
          </button>
        ) : (
          <button
            type="button"
            onClick={complete}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-black bg-[#7df2c3] px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
          >
            Hoàn tất làm quen →
          </button>
        )}
      </div>
    </section>
  );
}
