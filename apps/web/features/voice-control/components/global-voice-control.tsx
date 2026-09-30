"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "../hooks/use-speech-recognition";
import {
  normalizeVoiceText,
  parseGlobalVoiceCommand,
  type GlobalVoiceCommand,
} from "../utils/global-voice-control";
import { isWorkspaceVoiceRoute } from "../utils/global-voice-routes";
import {
  conciseAnnouncement,
  distinctAnnouncement,
  speechStatusAnnouncement,
  type SpeechAnnouncementState,
} from "../utils/accessible-announcements";

type ActionElement = HTMLAnchorElement | HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function elementLabel(element: HTMLElement) {
  const aria = element.getAttribute("aria-label");
  const title = element.getAttribute("title");
  const placeholder = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.placeholder : "";
  const value = element instanceof HTMLInputElement && ["button", "submit", "reset"].includes(element.type) ? element.value : "";
  return normalizeVoiceText([aria, title, placeholder, value, element.innerText, element.textContent].filter(Boolean).join(" "));
}

function findElementByVoiceLabel(label: string, selector: string) {
  const normalized = normalizeVoiceText(label);
  const queryTokens = new Set(normalized.split(" ").filter((token) => token.length > 1));
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
  return candidates
    .map((element) => {
      const label = elementLabel(element);
      const labelTokens = new Set(label.split(" ").filter((token) => token.length > 1));
      const overlap = Array.from(queryTokens).filter((token) => labelTokens.has(token)).length;
      return { element, label, overlap };
    })
    .filter((entry) => entry.label)
    .sort((a, b) => {
      const aExact = a.label === normalized ? 0 : 1;
      const bExact = b.label === normalized ? 0 : 1;
      return aExact - bExact || b.overlap - a.overlap || a.label.length - b.label.length;
    })
    .find((entry) => entry.label === normalized || entry.label.includes(normalized) || normalized.includes(entry.label) || entry.overlap >= Math.max(1, queryTokens.size))?.element as ActionElement | undefined;
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as HTMLInputElement | HTMLTextAreaElement;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function GlobalVoiceControl() {
  const router = useRouter();
  const pathname = usePathname();
  const speech = useSpeechRecognition();
  const lastFinalResultIdRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [feedback, setFeedback] = useState("Nói: trải nghiệm ngay, bấm Đăng nhập, cuộn xuống, hoặc trợ giúp.");
  const [lastCommand, setLastCommand] = useState<GlobalVoiceCommand | null>(null);
  const [announcement, setAnnouncement] = useState({ id: 0, text: "" });
  const previousSpeechStatusRef = useRef<SpeechAnnouncementState | null>(null);
  const previousFeedbackRef = useRef(feedback);
  const previousCommandRef = useRef<GlobalVoiceCommand | null>(null);
  const lastAnnouncementRef = useRef("");
  const hiddenForWorkspace = isWorkspaceVoiceRoute(pathname);

  const announce = useCallback((message: string | null, repeatEvent = false) => {
    const next = distinctAnnouncement(lastAnnouncementRef.current, message, repeatEvent);
    if (!next) return;
    lastAnnouncementRef.current = next;
    setAnnouncement((current) => ({ id: current.id + 1, text: next }));
  }, []);

  useEffect(() => {
    if (hiddenForWorkspace || (!enabled && !speech.isListening)) {
      previousSpeechStatusRef.current = null;
      return;
    }
    const current: SpeechAnnouncementState = {
      errorMessage: speech.errorMessage,
      isListening: speech.isListening,
      isSupportKnown: speech.isSupportKnown,
      isSupported: speech.isSupported,
    };
    const message = speechStatusAnnouncement(
      previousSpeechStatusRef.current,
      current,
      "Em có thể dùng thanh Nhập lệnh ở cuối màn hình.",
    );
    announce(message);
    previousSpeechStatusRef.current = current;
  }, [announce, enabled, hiddenForWorkspace, speech.errorMessage, speech.isListening, speech.isSupportKnown, speech.isSupported]);

  useEffect(() => {
    const commandChanged = lastCommand !== previousCommandRef.current;
    if ((feedback !== previousFeedbackRef.current || commandChanged) && !hiddenForWorkspace) {
      announce(conciseAnnouncement(feedback), commandChanged);
    }
    previousFeedbackRef.current = feedback;
    previousCommandRef.current = lastCommand;
  }, [announce, feedback, hiddenForWorkspace, lastCommand]);

  useEffect(() => {
    if (hiddenForWorkspace || !enabled || !speech.transcript || speech.finalResultId === lastFinalResultIdRef.current) return;
    lastFinalResultIdRef.current = speech.finalResultId;
    runCommand(parseGlobalVoiceCommand(speech.transcript));
    // runCommand intentionally reads the latest DOM/router state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hiddenForWorkspace, speech.finalResultId, speech.transcript]);

  useEffect(() => {
    if (!enabled && speech.isListening) speech.stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!hiddenForWorkspace) return;
    if (speech.isListening) speech.stopListening();
    setEnabled(false);
    setExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenForWorkspace]);

  function start() {
    if (hiddenForWorkspace) return;
    setExpanded(true);
    setEnabled(true);
    void speech.startListening();
  }

  function stop() {
    void speech.stopListening();
    setEnabled(false);
    setFeedback("Đã tắt điều khiển web bằng giọng nói.");
  }

  function runCommand(command: GlobalVoiceCommand) {
    setLastCommand(command);
    switch (command.kind) {
      case "navigate":
        router.push(command.href);
        setFeedback(`Đang mở ${command.label}.`);
        return;
      case "history":
        if (command.direction === "back") {
          router.back();
          setFeedback("Đang quay lại trang trước.");
        } else {
          window.history.forward();
          setFeedback("Đang đi tới trang sau.");
        }
        return;
      case "scroll":
        if (command.direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
        if (command.direction === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        if (command.direction === "down") window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
        if (command.direction === "up") window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: "smooth" });
        setFeedback(command.direction === "down" ? "Đã cuộn xuống." : command.direction === "up" ? "Đã cuộn lên." : command.direction === "top" ? "Đã về đầu trang." : "Đã xuống cuối trang.");
        return;
      case "click": {
        const element = findElementByVoiceLabel(command.label, 'a[href], button:not([disabled]), [role="button"], input[type="button"], input[type="submit"]');
        if (!element) {
          setFeedback(`Chưa tìm thấy nút hoặc liên kết "${command.label}". Hãy nói tên hiển thị trên màn hình.`);
          return;
        }
        element.focus();
        element.click();
        setFeedback(`Đã bấm ${elementLabel(element) || command.label}.`);
        return;
      }
      case "focus": {
        const element = findElementByVoiceLabel(command.label, "input, textarea, select, button, a[href]");
        if (!element) {
          setFeedback(`Chưa tìm thấy mục "${command.label}".`);
          return;
        }
        element.focus();
        setFeedback(`Đã chọn ${elementLabel(element) || command.label}.`);
        return;
      }
      case "fill_focused": {
        const element = document.activeElement;
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          setFeedback("Hãy chọn một ô nhập trước, ví dụ: chọn ô email.");
          return;
        }
        setNativeValue(element, command.value);
        setFeedback("Đã nhập vào ô đang chọn.");
        return;
      }
      case "clear_focused": {
        const element = document.activeElement;
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          setFeedback("Hãy chọn một ô nhập trước khi xoá nội dung.");
          return;
        }
        setNativeValue(element, "");
        setFeedback("Đã xoá nội dung ô đang chọn.");
        return;
      }
      case "help":
        setFeedback("Có thể nói: trải nghiệm ngay, mở bài học, bấm Đăng nhập, chọn ô email, nhập nội dung, cuộn xuống, quay lại.");
        return;
      case "stop":
        stop();
        return;
      case "unknown":
        setFeedback("Mình chưa hiểu lệnh điều khiển web này. Hãy nói: trải nghiệm ngay, bấm Đăng nhập, cuộn xuống, hoặc trợ giúp.");
        return;
      default: {
        const _exhaustive: never = command;
        return _exhaustive;
      }
    }
  }

  if (hiddenForWorkspace) return null;

  return (
    <div
      className="fixed right-4 z-[var(--z-global-voice)] w-[min(22rem,calc(100vw-2rem))]"
      style={{ bottom: "calc(var(--global-command-bar-height, 0px) + 1rem)" }}
    >
      <p aria-atomic="true" className="sr-only" role="status"><span key={announcement.id}>{announcement.text}</span></p>
      {!expanded ? (
        <Button
          aria-label="Bật điều khiển web bằng giọng nói"
          className="w-full justify-center"
          onClick={start}
          type="button"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          Điều khiển web bằng giọng nói
        </Button>
      ) : (
        <section
          aria-label="Điều khiển web bằng giọng nói"
          className="scc-voice-debug-panel min-w-0 max-w-full overflow-hidden rounded-[1rem] border-4 border-black bg-white p-3 text-black shadow-[8px_8px_0_#121212]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black">Điều khiển bằng giọng nói</p>
              <p className="mt-1 text-xs text-zinc-700">Trang hiện tại: {pathname}</p>
            </div>
            <button
              aria-label="Đóng điều khiển web bằng giọng nói"
              className="rounded border-2 border-black bg-white p-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff5f87]"
              onClick={() => {
                stop();
                setExpanded(false);
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              aria-label={speech.isListening ? "Dừng nghe điều khiển web" : "Bắt đầu nghe điều khiển web"}
              disabled={!speech.isSupportKnown || !speech.isSupported || speech.isStarting}
              onClick={() => {
                setEnabled(true);
                if (speech.isListening) void speech.stopListening();
                else void speech.startListening();
              }}
              size="sm"
              type="button"
            >
              {speech.isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {speech.isListening ? "Dừng" : speech.isStarting ? "Đang mở micro" : !speech.isSupportKnown ? "Đang kiểm tra" : "Nói"}
            </Button>
            <Button
              disabled={speech.isListening || speech.isStarting}
              onClick={() => {
                void speech.retryASR();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Thử lại nhận dạng
            </Button>
            <label className="min-w-[170px] flex-1 text-[10px] font-black uppercase tracking-[0.12em] text-black">
              Micro
              <select
                aria-label="Chọn micro để kiểm tra điều khiển web bằng giọng nói"
                className="mt-1 block min-h-9 w-full rounded border-2 border-black bg-white px-2 py-1 text-xs font-semibold normal-case tracking-normal text-black focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff5f87]"
                disabled={speech.isListening || speech.isStarting}
                onChange={(event) => speech.selectMicrophone(event.target.value)}
                onFocus={() => {
                  void speech.refreshMicrophones();
                }}
                value={speech.selectedMicrophoneId}
              >
                <option value="">Micro mặc định</option>
                {speech.audioInputs.map((input) => (
                  <option key={input.deviceId || input.label} value={input.deviceId}>
                    {input.label}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={() => runCommand({ kind: "help" })} size="sm" type="button" variant="outline">
              Trợ giúp
            </Button>
          </div>

          <div className="mt-3 min-w-0 space-y-1 text-xs">
            {speech.interimTranscript && <p className="min-w-0 break-words">Đang nghe: “{speech.interimTranscript}”</p>}
            {speech.transcript && <p className="min-w-0 break-words">Đã nghe: “{speech.transcript}”</p>}
            {lastCommand && <p className="min-w-0 break-words">Mình hiểu là: {lastCommand.kind}</p>}
            <p className="min-w-0 break-words">Đang dùng: <span className="font-semibold">{speech.engineLabel}</span></p>
            {speech.asrState === "processing" && <p className="min-w-0 break-words text-zinc-600">Đang xử lý giọng nói...</p>}
            <p className="min-w-0 break-words font-semibold text-black">{feedback}</p>
            {!speech.isSupportKnown && <p className="min-w-0 break-words text-zinc-600">Đang kết nối nhận dạng giọng nói...</p>}
            {speech.errorMessage && <p className="min-w-0 break-words text-red-700">{speech.errorMessage}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
