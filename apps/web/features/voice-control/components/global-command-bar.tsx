"use client";

import { useEffect, useRef, useState } from "react";
import { Command, PanelTopClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGlobalCommand } from "./global-command-context";
import { conciseAnnouncement } from "../utils/accessible-announcements";

const IS_DEV = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_MODE === "true";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable;
}

function GlobalCommandBarInner() {
  const { lastResult, lastResultId, setCommandBarHeight, submitCommand, workspace } = useGlobalCommand();
  const [command, setCommand] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const barRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hiddenForModal = workspace?.modalOpen === true;

  useEffect(() => {
    if (hiddenForModal || collapsed) {
      document.documentElement.style.setProperty("--global-command-bar-height", "0px");
      setCommandBarHeight(0);
      return;
    }
    const element = barRef.current;
    if (!element) return;
    const updateHeight = () => {
      const height = collapsed ? 0 : Math.ceil(element.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--global-command-bar-height", `${height}px`);
      setCommandBarHeight(height);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--global-command-bar-height", "0px");
      setCommandBarHeight(0);
    };
  }, [collapsed, hiddenForModal, setCommandBarHeight]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !collapsed) {
        setCollapsed(true);
        document.getElementById("voice-activation")?.focus({ preventScroll: true });
        return;
      }
      if (!event.altKey || event.key.toLowerCase() !== "g") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setCollapsed(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  useEffect(() => {
    const focusCommandBar = () => {
      setCollapsed(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("scc:focus-command-bar", focusCommandBar);
    return () => window.removeEventListener("scc:focus-command-bar", focusCommandBar);
  }, []);

  function sendCommand(value: string) {
    const result = submitCommand(value);
    if (result.handled || result.target === "workspace") setCommand("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Developer tooling is opt-in via Alt+G (or the existing developer event).
  // A second collapsed floating bar must not cover the learner's voice HUD.
  if (hiddenForModal || collapsed) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-[var(--z-global-command)] flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3"
    >
      <section
        aria-label="Thanh nhập lệnh toàn cục"
        className="scc-voice-debug-panel max-h-[45dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border-2 sm:border-[2.5px] border-black bg-white p-2.5 text-black shadow-[4px_4px_0_#121212] sm:p-3.5"
      >
        {!workspace && <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff5f87]" />
            <p className="text-xs font-black uppercase tracking-wider text-black">{workspace ? "Nói hoặc nhập lệnh cho bài học" : "[DEV] Nhập lệnh"}</p>
          </div>
          <Button
            aria-expanded="true"
            aria-label="Thu gọn thanh nhập lệnh toàn cục"
            onClick={() => {
              setCollapsed(true);
              document.getElementById("voice-activation")?.focus({ preventScroll: true });
            }}
            size="sm"
            type="button"
            variant="outline"
            className="border-2 border-black text-xs font-bold shadow-[2px_2px_0_#121212] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
          >
            <PanelTopClose className="mr-1.5 h-3.5 w-3.5" />
            Thu gọn
          </Button>
        </div>}

        <form
          className="mt-2 flex items-center gap-2"
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
              className="font-mono normal-case tracking-normal border-2 border-black bg-[#fffdf3] text-sm focus-visible:outline-black"
              id="globalCommandInput"
              onChange={(event) => setCommand(event.target.value)}
              placeholder={workspace ? "Nhập lệnh, ví dụ: thêm khối In" : "Nhập lệnh..."}
              value={command}
            />
          </label>
          <Button disabled={!command.trim()} type="submit" variant="secondary" className="border-2 border-black font-bold shadow-[2px_2px_0_#121212] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5">
            <Command className="mr-1.5 h-4 w-4" />
            Gửi
          </Button>
          {workspace && (
            <Button
              aria-label="Thu gọn thanh nhập lệnh"
              onClick={() => setCollapsed(true)}
              size="sm"
              type="button"
              variant="outline"
              className="border-2 border-black font-bold shadow-[2px_2px_0_#121212]"
            >
              <PanelTopClose className="h-4 w-4" />
            </Button>
          )}
          {workspace?.pendingPreview && (
            <>
              <Button type="button" variant="secondary" onClick={() => sendCommand("đúng rồi")} className="border-2 border-black font-bold">
                Xác nhận
              </Button>
              <Button type="button" variant="outline" onClick={() => sendCommand("hủy")} className="border-2 border-black font-bold">
                Hủy
              </Button>
            </>
          )}
        </form>

        <div className="mt-1.5 min-w-0 text-xs" id="globalCommandFeedback">
          <p className="sr-only" id="globalCommandHelp">{workspace ? "Lệnh điều khiển vùng khối của bài học." : "Lệnh điều khiển trang web."}</p>
          {lastResult?.feedback && (
            <p className={`min-w-0 break-words font-semibold ${lastResult.handled ? "text-black" : "text-red-700"}`}>
              {lastResult.feedback}
            </p>
          )}
          {workspace?.pendingPreview && (
            <p className="min-w-0 break-words rounded-lg border-2 border-black bg-[#fff6a8] px-2.5 py-1.5 font-bold text-black shadow-[2px_2px_0_#121212]">
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

export function GlobalCommandBar() {
  if (!IS_DEV) return null;
  return <GlobalCommandBarInner />;
}
