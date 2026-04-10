"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useSpeechRecognition() {
  const Recognition = useMemo(
    () => (typeof window !== "undefined" ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined),
    [],
  );
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const nextTranscript = lastResult?.[0]?.transcript?.trim() ?? "";
      setTranscript(nextTranscript);
    };

    recognition.onerror = (event) => {
      setErrorMessage(`Không thể nhận giọng nói: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [Recognition]);

  function startListening() {
    if (!recognitionRef.current) {
      setErrorMessage("Trình duyệt hiện tại chưa hỗ trợ nhận giọng nói.");
      return;
    }

    setTranscript("");
    setErrorMessage(null);
    recognitionRef.current.start();
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return {
    errorMessage,
    isListening,
    isSupported: Boolean(Recognition),
    startListening,
    stopListening,
    transcript,
  };
}
