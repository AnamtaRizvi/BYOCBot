"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

function getSpeechSupportedSnapshot(): boolean {
  return !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
}

export function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    getSpeechSupportedSnapshot,
    () => false,
  );
}
