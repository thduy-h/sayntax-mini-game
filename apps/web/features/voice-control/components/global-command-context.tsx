"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSpeechRecognition } from "../hooks/use-speech-recognition";
import {
  normalizeVoiceText,
  parseGlobalVoiceCommand,
  type GlobalVoiceCommand,
} from "../utils/global-voice-control";
import {
  chooseGlobalCommandTarget,
  commandResultForLessonRegistration,
  shouldClearCommandResultForLesson,
  type GlobalCommandExecutionResult,
  type WorkspaceCommandRegistration,
} from "../utils/global-command-routing";
import { acknowledgeVoiceProcessing, hasAcknowledgedVoiceProcessing } from "../utils/voice-privacy";

export type VoiceOperationalState =
  | { kind: "idle"; message: string }
  | { kind: "requesting_permission"; message: string }
  | { kind: "listening"; interimTranscript?: string; message: string }
  | { kind: "processing"; transcript: string; message: string }
  | { kind: "success"; transcript: string; action: string; message: string }
  | { kind: "unknown_command"; transcript: string; message: string }
  | { kind: "interrupted"; error: string; message: string }
  | { kind: "stopped_by_user"; message: string };

type ActionElement = HTMLAnchorElement | HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface GlobalCommandContextValue {
  commandBarHeight: number;
  lastResult: GlobalCommandExecutionResult | null;
  lastResultId: number;
  registerWorkspaceCommand: (registration: WorkspaceCommandRegistration) => () => void;
  setCommandBarHeight: (height: number) => void;
  submitCommand: (command: string) => GlobalCommandExecutionResult;
  workspace: WorkspaceCommandRegistration | null;
  // Unified Voice State & Operations:
  speech: ReturnType<typeof useSpeechRecognition>;
  operationalState: VoiceOperationalState;
  startVoice: () => Promise<void>;
  stopVoice: (byUser?: boolean) => Promise<void>;
  userExplicitlyStopped: boolean;
  voicePrivacyAcknowledged: boolean;
  acknowledgePrivacy: () => void;
}

const GlobalCommandContext = createContext<GlobalCommandContextValue | null>(null);

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
      const labelText = elementLabel(element);
      const labelTokens = new Set(labelText.split(" ").filter((token) => token.length > 1));
      const overlap = Array.from(queryTokens).filter((token) => labelTokens.has(token)).length;
      return { element, label: labelText, overlap };
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

function describeGlobalCommand(command: GlobalVoiceCommand) {
  switch (command.kind) {
    case "navigate":
      return `mở ${command.label}`;
    case "history":
      return command.direction === "back" ? "quay lại trang trước" : "đi tới trang sau";
    case "scroll":
      return {
        bottom: "cuộn xuống cuối trang",
        down: "cuộn trang xuống",
        top: "về đầu trang",
        up: "cuộn trang lên",
      }[command.direction];
    case "click":
      return `bấm ${command.label}`;
    case "focus":
      return `chọn ${command.label}`;
    case "fill_focused":
      return "nhập vào ô đang chọn";
    case "clear_focused":
      return "xóa nội dung ô đang chọn";
    case "help":
      return "trợ giúp điều khiển website";
    case "stop":
      return "tắt điều khiển web bằng giọng nói";
    case "unknown":
      return "chưa hiểu lệnh website";
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}

export function GlobalCommandProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const speech = useSpeechRecognition();
  const [workspace, setWorkspace] = useState<WorkspaceCommandRegistration | null>(null);
  const [lastResult, setLastResult] = useState<GlobalCommandExecutionResult | null>(null);
  const [lastResultId, setLastResultId] = useState(0);
  const [commandBarHeight, setCommandBarHeight] = useState(0);
  const [voicePrivacyAcknowledged, setVoicePrivacyAcknowledged] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return hasAcknowledgedVoiceProcessing(window.localStorage);
    } catch {
      return false;
    }
  });
  const userExplicitlyStoppedRef = useRef(false);
  const [userExplicitlyStopped, setUserExplicitlyStopped] = useState(false);
  const hasEverStartedRef = useRef(false);
  const activeLessonSlugRef = useRef<string | null>(null);
  const lastProcessedFinalIdRef = useRef(0);

  const acknowledgePrivacy = useCallback(() => {
    try {
      acknowledgeVoiceProcessing(window.localStorage);
    } catch {
      // storage unavailable
    }
    setVoicePrivacyAcknowledged(true);
  }, []);

  const startVoice = useCallback(async () => {
    userExplicitlyStoppedRef.current = false;
    setUserExplicitlyStopped(false);
    hasEverStartedRef.current = true;
    acknowledgePrivacy();
    await speech.startListening();
  }, [acknowledgePrivacy, speech]);

  const stopVoice = useCallback(async (byUser = false) => {
    if (byUser) {
      userExplicitlyStoppedRef.current = true;
      setUserExplicitlyStopped(true);
      hasEverStartedRef.current = false;
    }
    await speech.stopListening();
  }, [speech]);

  // Auto-recover from technical interruptions or browser SpeechRecognition silence timeouts,
  // keeping the session continuously alive until the user explicitly stops.
  useEffect(() => {
    if (!hasEverStartedRef.current || userExplicitlyStoppedRef.current) return;
    if (speech.isListening || speech.isStarting || speech.errorMessage) return;

    const timer = setTimeout(() => {
      if (hasEverStartedRef.current && !userExplicitlyStoppedRef.current && !speech.isListening && !speech.isStarting && !speech.errorMessage) {
        void speech.startListening();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [speech]);

  // Operational State derived directly from speech engine, user gestures, and last outcome
  const operationalState = useMemo<VoiceOperationalState>(() => {
    if (userExplicitlyStopped && !speech.isListening) {
      return {
        kind: "stopped_by_user",
        message: "Bạn đã chủ động dừng nghe. Bấm 'Bắt đầu' khi muốn tiếp tục.",
      };
    }
    if (speech.errorMessage) {
      return {
        kind: "interrupted",
        error: speech.errorMessage,
        message: speech.errorMessage,
      };
    }
    if (speech.isStarting) {
      return {
        kind: "requesting_permission",
        message: "Đang kết nối nhận dạng giọng nói...",
      };
    }
    if (speech.asrState === "processing") {
      return {
        kind: "processing",
        transcript: speech.transcript,
        message: `Đang xử lý câu lệnh: “${speech.transcript}”...`,
      };
    }
    if (speech.isListening) {
      if (speech.interimTranscript) {
        return {
          kind: "listening",
          interimTranscript: speech.interimTranscript,
          message: `Đang nghe: “${speech.interimTranscript}”`,
        };
      }
      return {
        kind: "listening",
        message: "Đang lắng nghe câu lệnh của bạn...",
      };
    }
    if (lastResult) {
      if (lastResult.handled) {
        return {
          kind: "success",
          transcript: lastResult.command,
          action: lastResult.understoodAs ?? lastResult.feedback,
          message: lastResult.feedback,
        };
      }
      return {
        kind: "unknown_command",
        transcript: lastResult.command,
        message: lastResult.feedback,
      };
    }
    return {
      kind: "idle",
      message: "Chưa bật điều khiển giọng nói. Bấm nút hoặc dùng Voice Access để kích hoạt.",
    };
  }, [
    lastResult,
    speech.asrState,
    speech.errorMessage,
    speech.interimTranscript,
    speech.isListening,
    speech.isStarting,
    speech.transcript,
    userExplicitlyStopped,
  ]);

  // Auto-start for returning user with granted permission and consent
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current || userExplicitlyStoppedRef.current) return;
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    try {
      const acknowledged = hasAcknowledgedVoiceProcessing(window.localStorage);
      if (!acknowledged) return;
    } catch {
      return;
    }

    let cancelled = false;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === "granted" && !autoStartedRef.current && !userExplicitlyStoppedRef.current) {
          autoStartedRef.current = true;
          void startVoice();
        }
      })
      .catch(() => {
        // Permissions query not supported or failed - ignore
      });

    return () => {
      cancelled = true;
    };
  }, [startVoice]);

  const registerWorkspaceCommand = useCallback((registration: WorkspaceCommandRegistration) => {
    const previousLessonSlug = activeLessonSlugRef.current;
    if (shouldClearCommandResultForLesson(previousLessonSlug, registration.lessonSlug)) {
      setLastResult((current) => commandResultForLessonRegistration(
        current,
        previousLessonSlug,
        registration.lessonSlug,
      ));
    }
    activeLessonSlugRef.current = registration.lessonSlug;
    setWorkspace(registration);
    return () => {
      setWorkspace((current) => (current?.id === registration.id ? null : current));
    };
  }, []);

  const submitWebsiteCommand = useCallback((commandText: string): GlobalCommandExecutionResult => {
    const command = parseGlobalVoiceCommand(commandText);
    const understoodAs = describeGlobalCommand(command);
    switch (command.kind) {
      case "navigate":
        router.push(command.href);
        return { command: commandText, feedback: `Đang mở ${command.label}.`, handled: true, target: "website", understoodAs };
      case "history":
        if (command.direction === "back") window.history.back();
        else window.history.forward();
        return {
          command: commandText,
          feedback: command.direction === "back" ? "Đang quay lại trang trước." : "Đang đi tới trang sau.",
          handled: true,
          target: "website",
          understoodAs,
        };
      case "scroll":
        if (command.direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
        if (command.direction === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        if (command.direction === "down") window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
        if (command.direction === "up") window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: "smooth" });
        return {
          command: commandText,
          feedback: command.direction === "down" ? "Đã cuộn trang xuống." : command.direction === "up" ? "Đã cuộn trang lên." : command.direction === "top" ? "Đã về đầu trang." : "Đã xuống cuối trang.",
          handled: true,
          target: "website",
          understoodAs,
        };
      case "click": {
        const element = findElementByVoiceLabel(command.label, 'a[href], button:not([disabled]), [role="button"], input[type="button"], input[type="submit"]');
        if (!element) {
          return { command: commandText, feedback: `Chưa tìm thấy nút hoặc liên kết "${command.label}".`, handled: false, target: "website", understoodAs };
        }
        element.focus();
        element.click();
        return { command: commandText, feedback: `Đã bấm ${elementLabel(element) || command.label}.`, handled: true, target: "website", understoodAs };
      }
      case "focus": {
        const element = findElementByVoiceLabel(command.label, "input, textarea, select, button, a[href]");
        if (!element) return { command: commandText, feedback: `Chưa tìm thấy mục "${command.label}".`, handled: false, target: "website", understoodAs };
        element.focus();
        return { command: commandText, feedback: `Đã chọn ${elementLabel(element) || command.label}.`, handled: true, target: "website", understoodAs };
      }
      case "fill_focused": {
        const element = document.activeElement;
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          return { command: commandText, feedback: "Hãy chọn một ô nhập trước, ví dụ: chọn ô email.", handled: false, target: "website", understoodAs };
        }
        setNativeValue(element, command.value);
        return { command: commandText, feedback: "Đã nhập vào ô đang chọn.", handled: true, target: "website", understoodAs };
      }
      case "clear_focused": {
        const element = document.activeElement;
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          return { command: commandText, feedback: "Hãy chọn một ô nhập trước khi xoá nội dung.", handled: false, target: "website", understoodAs };
        }
        setNativeValue(element, "");
        return { command: commandText, feedback: "Đã xoá nội dung ô đang chọn.", handled: true, target: "website", understoodAs };
      }
      case "help": {
        const guide = document.getElementById("voice-guide");
        if (guide) {
          guide.scrollIntoView({ behavior: "smooth", block: "start" });
          return {
            command: commandText,
            feedback: "Đã chuyển đến bảng hướng dẫn giọng nói chi tiết.",
            handled: true,
            target: "website",
            understoodAs: "mở hướng dẫn chi tiết",
          };
        }
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          router.push("/#voice-guide");
          return {
            command: commandText,
            feedback: "Đang mở bảng hướng dẫn giọng nói chi tiết.",
            handled: true,
            target: "website",
            understoodAs: "mở hướng dẫn chi tiết",
          };
        }
        return { command: commandText, feedback: "Có thể nói: học thử, bài 1, cuộn xuống, quay lại, trợ giúp.", handled: true, target: "website", understoodAs };
      }
      case "stop":
        void stopVoice(true);
        return { command: commandText, feedback: "Đã tắt điều khiển bằng giọng nói theo yêu cầu.", handled: true, target: "website", understoodAs };
      case "unknown":
        return { command: commandText, feedback: `Chưa hiểu câu lệnh “${commandText}”. Hãy nói: học thử, bài 1, cuộn xuống, hoặc trợ giúp.`, handled: false, target: "website", understoodAs };
      default: {
        const _exhaustive: never = command;
        return _exhaustive;
      }
    }
  }, [router, stopVoice]);

  const submitCommand = useCallback((command: string): GlobalCommandExecutionResult => {
    const trimmed = command.trim();
    const target = chooseGlobalCommandTarget(workspace);
    let result: GlobalCommandExecutionResult;
    if (!trimmed) {
      result = { command, feedback: "Hãy nói một câu lệnh.", handled: false, target };
    } else if (target === "modal_blocked") {
      result = {
        command: trimmed,
        feedback: "Bài học đang hiển thị hộp thoại hoàn thành. Hãy nói câu lệnh cho hộp thoại hoặc đóng nó.",
        handled: false,
        target,
      };
    } else if (target === "workspace_not_ready") {
      result = {
        command: trimmed,
        feedback: "Vùng làm việc đang khởi tạo. Vui lòng thử lại sau giây lát.",
        handled: false,
        target,
      };
    } else if (target === "workspace" && workspace) {
      result = workspace.handleTextCommand(trimmed);
    } else {
      result = submitWebsiteCommand(trimmed);
    }
    setLastResult(result);
    setLastResultId((current) => current + 1);
    return result;
  }, [submitWebsiteCommand, workspace]);

  // Dispatch global voice commands when outside workspace
  useEffect(() => {
    if (workspace !== null) return;
    if (!speech.transcript || speech.finalResultId === lastProcessedFinalIdRef.current) return;
    lastProcessedFinalIdRef.current = speech.finalResultId;

    const trimmed = speech.transcript.trim();
    if (!trimmed) return;

    queueMicrotask(() => {
      const result = submitWebsiteCommand(trimmed);
      setLastResult(result);
      setLastResultId((curr) => curr + 1);
    });
  }, [speech.finalResultId, speech.transcript, submitWebsiteCommand, workspace]);

  const value = useMemo<GlobalCommandContextValue>(() => ({
    acknowledgePrivacy,
    commandBarHeight,
    lastResult,
    lastResultId,
    operationalState,
    registerWorkspaceCommand,
    setCommandBarHeight,
    speech,
    startVoice,
    stopVoice,
    submitCommand,
    userExplicitlyStopped,
    voicePrivacyAcknowledged,
    workspace,
  }), [
    acknowledgePrivacy,
    commandBarHeight,
    lastResult,
    lastResultId,
    operationalState,
    registerWorkspaceCommand,
    setCommandBarHeight,
    speech,
    startVoice,
    stopVoice,
    submitCommand,
    userExplicitlyStopped,
    voicePrivacyAcknowledged,
    workspace,
  ]);

  return <GlobalCommandContext.Provider value={value}>{children}</GlobalCommandContext.Provider>;
}

export function useGlobalCommand() {
  const context = useContext(GlobalCommandContext);
  if (!context) throw new Error("useGlobalCommand must be used inside GlobalCommandProvider");
  return context;
}
