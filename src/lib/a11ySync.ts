import { useCallback, useEffect, useState } from "react";

export type A11yViewMode = "before" | "after";

const STORAGE_KEY = "sayntax_a11y_view_mode";
const CHANNEL_NAME = "sayntax_a11y_sync";

export function useA11ySync(initialMode: A11yViewMode = "before") {
  const [viewMode, setViewModeState] = useState<A11yViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "before" || saved === "after") return saved;
    } catch {
      // Ignore storage errors in restricted contexts
    }
    return initialMode;
  });

  const setViewMode = useCallback((mode: A11yViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ mode });
        channel.close();
      }
    } catch {
      // Ignore channel errors
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY &&
        (e.newValue === "before" || e.newValue === "after")
      ) {
        setViewModeState(e.newValue as A11yViewMode);
      }
    };
    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (e) => {
          if (e.data?.mode === "before" || e.data?.mode === "after") {
            setViewModeState(e.data.mode as A11yViewMode);
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      try {
        channel?.close();
      } catch {
        // Ignore
      }
    };
  }, []);

  return [viewMode, setViewMode] as const;
}
