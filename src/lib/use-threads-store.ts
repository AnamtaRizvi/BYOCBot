"use client";

import { useSyncExternalStore } from "react";
import type { Thread } from "@/types";
import { createThread, loadThreads, saveThreads } from "./threads";

const THREADS_EVENT = "rbs-threads-updated";
const SERVER_SNAPSHOT: Thread[] = [];

let clientSnapshot: Thread[] | null = null;

function ensureClientSnapshot(): Thread[] {
  if (clientSnapshot !== null) return clientSnapshot;

  const stored = loadThreads();
  if (stored.length > 0) {
    clientSnapshot = stored;
    return clientSnapshot;
  }

  const fresh = createThread();
  clientSnapshot = saveThreads([fresh]);
  return clientSnapshot;
}

function getThreadsSnapshot(): Thread[] {
  return ensureClientSnapshot();
}

function getServerThreadsSnapshot(): Thread[] {
  return SERVER_SNAPSHOT;
}

function subscribeThreads(onStoreChange: () => void) {
  window.addEventListener(THREADS_EVENT, onStoreChange);
  return () => window.removeEventListener(THREADS_EVENT, onStoreChange);
}

export function notifyThreadsUpdated() {
  const stored = loadThreads();
  clientSnapshot = stored.length > 0 ? stored : null;
  window.dispatchEvent(new Event(THREADS_EVENT));
}

export function useThreadsStore(): Thread[] {
  return useSyncExternalStore(
    subscribeThreads,
    getThreadsSnapshot,
    getServerThreadsSnapshot,
  );
}

export function persistThreads(threads: Thread[]): Thread[] {
  clientSnapshot = saveThreads(threads);
  window.dispatchEvent(new Event(THREADS_EVENT));
  return clientSnapshot;
}
