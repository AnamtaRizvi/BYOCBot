"use client";

import { useCallback, useRef, useState } from "react";
import { useSpeechSupported } from "@/lib/use-speech-supported";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: ComposerProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const speechSupported = useSpeechSupported();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = text;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim += transcript;
        }
      }
      setText(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [text]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-zinc-200 bg-white p-4"
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        {speechSupported && (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            title={isRecording ? "Stop recording" : "Voice input"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
              isRecording
                ? "animate-pulse bg-red-100 text-red-600"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {isRecording ? "⏹" : "🎤"}
          </button>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask about modules or lecture content…"
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#CC0033] focus:ring-1 focus:ring-[#CC0033]"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="h-11 shrink-0 rounded-xl bg-[#CC0033] px-5 text-sm font-medium text-white transition hover:bg-[#a30028] disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {isRecording && (
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-red-600">
          Recording… tap stop when done. Review before sending.
        </p>
      )}
    </form>
  );
}
