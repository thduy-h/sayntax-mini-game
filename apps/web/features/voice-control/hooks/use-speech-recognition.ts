"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HybridASRManager } from "../asr/hybrid-manager";
import type { ASREngineType, ASRState } from "../asr/types";

type MicrophoneStatus = "unknown" | "checking" | "ready" | "blocked" | "missing" | "busy";
const START_EVENT = "scc-voice-recognition-starting";
const MICROPHONE_STORAGE_KEY = "scc_selected_microphone_id";
const DUPLICATE_FINAL_WINDOW_MS = 1200;

export interface AudioInputOption {
  deviceId: string;
  groupId: string;
  label: string;
}

export interface SpeechAlternativeResult {
  confidence?: number;
  transcript: string;
}

export function useSpeechRecognition() {
  const reactId = useId();
  const instanceIdRef = useRef(`voice-${reactId}`);
  const managerRef = useRef<HybridASRManager | null>(null);
  const selectedMicrophoneIdRef = useRef("");
  const lastFinalSignatureRef = useRef("");
  const lastFinalAtRef = useRef(0);
  const finalResultSequenceRef = useRef(0);
  const [alternatives, setAlternatives] = useState<SpeechAlternativeResult[]>([]);
  const [asrState, setAsrState] = useState<ASRState>("checking");
  const [audioInputs, setAudioInputs] = useState<AudioInputOption[]>([]);
  const [engineLabel, setEngineLabel] = useState("Đang kết nối ASR...");
  const [engineType, setEngineType] = useState<ASREngineType>("unavailable");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [finalResultId, setFinalResultId] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupportKnown, setIsSupportKnown] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<MicrophoneStatus>("unknown");
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [transcript, setTranscript] = useState("");

  async function refreshMicrophones() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setAudioInputs([]);
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        groupId: device.groupId,
        label: device.label || `Micro ${index + 1}`,
      }));
    setAudioInputs(inputs);
    if (
      selectedMicrophoneIdRef.current &&
      inputs.length > 0 &&
      !inputs.some((input) => input.deviceId === selectedMicrophoneIdRef.current)
    ) {
      selectedMicrophoneIdRef.current = "";
      setSelectedMicrophoneId("");
      window.localStorage.removeItem(MICROPHONE_STORAGE_KEY);
    }
    return inputs;
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(MICROPHONE_STORAGE_KEY) ?? "";
    selectedMicrophoneIdRef.current = saved;
    window.queueMicrotask(() => {
      setSelectedMicrophoneId(saved);
      void refreshMicrophones();
    });
    if (!navigator.mediaDevices) return;
    const handleDeviceChange = () => {
      void refreshMicrophones();
    };
    navigator.mediaDevices.addEventListener?.("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
  }, []);

  useEffect(() => {
    const manager = new HybridASRManager({
      callbacks: {
        onEngineChange: (nextEngine, label) => {
          setEngineType(nextEngine);
          setEngineLabel(label);
        },
        onError: (error) => {
          setErrorMessage(error.message);
          setMicrophoneStatus(
            error.code === "permission_denied"
              ? "blocked"
              : error.code === "microphone_missing"
                ? "missing"
                : error.code === "microphone_busy"
                  ? "busy"
                  : "unknown",
          );
        },
        onFinalResult: (result) => {
          const signature = `${result.engine}:${result.alternatives.map((alternative) => alternative.transcript).join("\n")}`;
          const now = performance.now();
          if (!result.text.trim()) return;
          if (signature === lastFinalSignatureRef.current && now - lastFinalAtRef.current < DUPLICATE_FINAL_WINDOW_MS) return;
          lastFinalSignatureRef.current = signature;
          lastFinalAtRef.current = now;
          finalResultSequenceRef.current += 1;
          setAlternatives(result.alternatives);
          setFinalResultId(finalResultSequenceRef.current);
          setTranscript(result.text);
          setInterimTranscript("");
          setErrorMessage(null);
        },
        onInterimResult: setInterimTranscript,
        onStateChange: (state) => {
          setAsrState(state);
          if (state === "checking") setEngineLabel("Đang kết nối ASR local...");
          if (state === "listening") setMicrophoneStatus("ready");
        },
      },
      selectedDeviceId: () => selectedMicrophoneIdRef.current,
    });
    managerRef.current = manager;
    void manager.initialize().finally(() => setIsSupportKnown(true));

    const stopForAnotherSession = (event: Event) => {
      const customEvent = event as CustomEvent<{ instanceId?: string }>;
      if (customEvent.detail?.instanceId === instanceIdRef.current) return;
      void manager.stop();
    };
    window.addEventListener(START_EVENT, stopForAnotherSession);

    return () => {
      window.removeEventListener(START_EVENT, stopForAnotherSession);
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  function selectMicrophone(deviceId: string) {
    selectedMicrophoneIdRef.current = deviceId;
    setSelectedMicrophoneId(deviceId);
    if (deviceId) window.localStorage.setItem(MICROPHONE_STORAGE_KEY, deviceId);
    else window.localStorage.removeItem(MICROPHONE_STORAGE_KEY);
    setErrorMessage(null);
    if (asrState === "listening" || asrState === "starting" || asrState === "processing") {
      void stopListening();
    }
  }

  async function startListening() {
    if (asrState === "listening" || asrState === "starting" || asrState === "processing") return;
    setTranscript("");
    setAlternatives([]);
    setInterimTranscript("");
    setErrorMessage(null);
    lastFinalSignatureRef.current = "";
    lastFinalAtRef.current = 0;
    window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { instanceId: instanceIdRef.current } }));
    await managerRef.current?.start();
  }

  async function stopListening() {
    await managerRef.current?.stop();
    setInterimTranscript("");
  }

  async function retryLocalASR() {
    if (asrState === "listening" || asrState === "starting" || asrState === "processing") return;
    setErrorMessage(null);
    setIsSupportKnown(false);
    await managerRef.current?.retryLocal();
    setIsSupportKnown(true);
  }

  return {
    alternatives,
    asrState,
    audioInputs,
    engineLabel,
    engineType,
    errorMessage,
    finalResultId,
    interimTranscript,
    isListening: asrState === "listening" || asrState === "processing" || asrState === "starting",
    isStarting: asrState === "checking",
    isSupportKnown,
    isSupported: engineType !== "unavailable",
    microphoneStatus,
    refreshMicrophones,
    retryLocalASR,
    selectedMicrophoneId,
    selectMicrophone,
    startListening,
    stopListening,
    transcript,
  };
}
