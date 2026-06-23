"use client";

import type { Thread } from "@/types";

const STORAGE_KEY = "rbs-threads";
const MAX_THREADS = 5;

export function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]) {
  const trimmed = threads
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .slice(0, MAX_THREADS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function createThread(firstMessage?: string): Thread {
  return {
    id: crypto.randomUUID(),
    title: firstMessage
      ? firstMessage.slice(0, 48) + (firstMessage.length > 48 ? "…" : "")
      : "New conversation",
    lastMessageAt: Date.now(),
    messages: [],
    sessionState: {},
  };
}

export function upsertThread(threads: Thread[], thread: Thread): Thread[] {
  const existing = threads.findIndex((t) => t.id === thread.id);
  if (existing >= 0) {
    threads[existing] = thread;
  } else {
    threads.unshift(thread);
  }
  return saveThreads(threads);
}
