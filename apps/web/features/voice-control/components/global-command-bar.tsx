"use client";

import { useEffect, useRef, useState } from "react";
import { Command, PanelTopClose, PanelTopOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGlobalCommand } from "./global-command-context";
import { conciseAnnouncement } from "../utils/accessible-announcements";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable;
}

export function GlobalCommandBar() {
  const { lastResult, lastResultId, setCommandBarHeight, submitCommand, workspace } = useGlobalCommand();
  const [command, setCommand] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasWorkspaceRef = useRef(false);
  const hiddenForModal = workspace?.modalOpen === true;

  useEffect(() => {
    if (hiddenForModal) {
      document.documentElement.style.setProperty("--global-command-bar-height", "0px");
      setCommandBarHeight(0);
      return;
    }
    const element = barRef.current;
    if (!element) return;
    const updateHeight = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--global-command-bar-height", `${height}px`);
      setCommandBarHeight(height);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsed, hiddenForModal, setCommandBarHeight]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.key.toLowerCase() !== "g") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setCollapsed(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const focusCommandBar = () => {
      setCollapsed(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("scc:focus-command-bar", focusCommandBar);
    return () => window.removeEventListener("scc:focus-command-bar", focusCommandBar);
  }, []);

  useEffect(() => {
    const inWorkspace = Boolean(workspace);
    if (inWorkspace && !wasWorkspaceRef.current) {
      window.queueMicrotask(() => setCollapsed(false));
    }
    wasWorkspaceRef.current = inWorkspace;
  }, [workspace]);

  function sendCommand(value: string) {
    const result = submitCommand(value);
    if (result.handled || result.target === "workspace") setCommand("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (hiddenForModal) return null;

  if (collapsed) {
    return (
      <div
        ref={barRef}
        className="scc-global-command-collapsed fixed inset-x-0 bottom-0 z-[var(--z-global-command)] flex justify-center px-3 pb-3"
      >
        <Button
          aria-expanded="false"
          aria-label="Mở thanh nhập lệnh toàn cục"
          className="min-h-11 border-4 border-black bg-[#a8e6ff] shadow-[4px_4px_0_#121212]"
          onClick={() => {
            setCollapsed(false);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          type="button"
        >
          <PanelTopOpen className="mr-2 h-4 w-4" />
          Nhập lệnh
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-[var(--z-global-command)] flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3"
    >
      <section
        aria-label="Thanh nhập lệnh toàn cục"
        className="scc-voice-debug-panel max-h-[45dvh] w-full max-w-4xl overflow-y-auto rounded-xl border-2 border-black bg-white p-2 text-black shadow-[3px_3px_0_#121212] sm:p-3"
      >
        {!workspace && <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-black">{workspace ? "Nói hoặc nhập lệnh cho bài học" : "Nhập lệnh điều khiển"}</p>
          <Button
            aria-expanded="true"
            aria-label="Thu gọn thanh nhập lệnh toàn cục"
            onClick={() => setCollapsed(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <PanelTopClose className="mr-2 h-4 w-4" />
            Thu gọn
          </Button>
        </div>}

        <form
          className="mt-1 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendCommand(command);
          }}
        >
          <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-[0.12em] text-black" htmlFor="globalCommandInput">
            <span className="sr-only">Nhập lệnh</span>
            <Input
              ref={inputRef}
              aria-describedby="globalCommandHelp"
              className="font-mono normal-case tracking-normal"
              id="globalCommandInput"
              onChange={(event) => setCommand(event.target.value)}
              placeholder={workspace ? "Nhập lệnh, ví dụ: thêm khối In" : "Nhập lệnh..."}
              value={command}
            />
          </label>
          <Button disabled={!command.trim()} type="submit" variant="secondary">
            <Command className="mr-2 h-4 w-4" />
            Gửi
          </Button>
          {workspace && <Button aria-label="Thu gọn thanh nhập lệnh" onClick={() => setCollapsed(true)} size="sm" type="button" variant="ghost"><PanelTopClose className="h-4 w-4" /></Button>}
          {workspace?.pendingPreview && (
            <>
              <Button type="button" variant="secondary" onClick={() => sendCommand("đúng rồi")}>
                Xác nhận
              </Button>
              <Button type="button" variant="outline" onClick={() => sendCommand("hủy")}>
                Hủy
              </Button>
            </>
          )}
        </form>

        <div className="mt-1 min-w-0 text-xs" id="globalCommandFeedback">
          <p className="sr-only" id="globalCommandHelp">{workspace ? "Lệnh điều khiển vùng khối của bài học." : "Lệnh điều khiển trang web."}</p>
          {lastResult?.feedback && (
            <p className={`min-w-0 break-words font-semibold ${lastResult.handled ? "text-black" : "text-red-700"}`}>
              {lastResult.feedback}
            </p>
          )}
          {workspace?.pendingPreview && (
            <p className="min-w-0 break-words rounded border-2 border-black bg-[#fff6a8] px-2 py-1 font-semibold text-black">
              {workspace.pendingPreview}
            </p>
          )}
        </div>
        <p aria-atomic="true" className="sr-only" role="status">
          <span key={lastResultId}>
            {lastResult && lastResult.target !== "workspace" ? conciseAnnouncement(lastResult.feedback) : ""}
          </span>
        </p>
      </section>
    </div>
  );
}
