"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  normalizeVoiceText,
  parseGlobalVoiceCommand,
  type GlobalVoiceCommand,
} from "../utils/global-voice-control";
import {
  chooseGlobalCommandTarget,
  type GlobalCommandExecutionResult,
  type WorkspaceCommandRegistration,
} from "../utils/global-command-routing";

type ActionElement = HTMLAnchorElement | HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface GlobalCommandContextValue {
  commandBarHeight: number;
  lastResult: GlobalCommandExecutionResult | null;
  lastResultId: number;
  registerWorkspaceCommand: (registration: WorkspaceCommandRegistration) => () => void;
  setCommandBarHeight: (height: number) => void;
  submitCommand: (command: string) => GlobalCommandExecutionResult;
  workspace: WorkspaceCommandRegistration | null;
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
  const [workspace, setWorkspace] = useState<WorkspaceCommandRegistration | null>(null);
  const [lastResult, setLastResult] = useState<GlobalCommandExecutionResult | null>(null);
  const [lastResultId, setLastResultId] = useState(0);
  const [commandBarHeight, setCommandBarHeight] = useState(0);

  const registerWorkspaceCommand = useCallback((registration: WorkspaceCommandRegistration) => {
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
      case "help":
        return { command: commandText, feedback: "Có thể nhập: trải nghiệm ngay, bấm Đăng nhập, cuộn xuống, quay lại.", handled: true, target: "website", understoodAs };
      case "stop":
        return { command: commandText, feedback: "Nút micro toàn web có thể tắt trong panel giọng nói.", handled: true, target: "website", understoodAs };
      case "unknown":
        return { command: commandText, feedback: "Mình chưa hiểu lệnh website này. Hãy nhập: trải nghiệm ngay, cuộn xuống, hoặc trợ giúp.", handled: false, target: "website", understoodAs };
      default: {
        const _exhaustive: never = command;
        return _exhaustive;
      }
    }
  }, [router]);

  const submitCommand = useCallback((command: string): GlobalCommandExecutionResult => {
    const trimmed = command.trim();
    const target = chooseGlobalCommandTarget(workspace);
    let result: GlobalCommandExecutionResult;
    if (!trimmed) {
      result = { command, feedback: "Hãy nhập một câu lệnh.", handled: false, target };
    } else if (target === "modal_blocked") {
      result = {
        command: trimmed,
        feedback: "Bài học đang hiển thị hộp thoại hoàn thành. Hãy đóng hộp thoại trước khi nhập lệnh.",
        handled: false,
        target,
      };
    } else if (target === "workspace_not_ready") {
      result = {
        command: trimmed,
        feedback: "Workspace đang khởi tạo. Vui lòng thử lại sau giây lát.",
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

  const value = useMemo<GlobalCommandContextValue>(() => ({
    commandBarHeight,
    lastResult,
    lastResultId,
    registerWorkspaceCommand,
    setCommandBarHeight,
    submitCommand,
    workspace,
  }), [commandBarHeight, lastResult, lastResultId, registerWorkspaceCommand, submitCommand, workspace]);

  return <GlobalCommandContext.Provider value={value}>{children}</GlobalCommandContext.Provider>;
}

export function useGlobalCommand() {
  const context = useContext(GlobalCommandContext);
  if (!context) throw new Error("useGlobalCommand must be used inside GlobalCommandProvider");
  return context;
}
