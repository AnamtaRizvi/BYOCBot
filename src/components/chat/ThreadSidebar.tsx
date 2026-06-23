"use client";

import Image from "next/image";
import type { Thread } from "@/types";

interface ThreadSidebarProps {
  threads: Thread[];
  activeThreadId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onDelete,
}: ThreadSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <div className="flex items-center gap-3">
          <Image
            src="/rutgers-logo.png"
            alt="Rutgers logo"
            width={44}
            height={44}
            priority
            unoptimized
            className="h-11 w-11 object-contain"
          />
          <div>
            <h1 className="text-sm font-bold text-[#CC0033]">BYOC Assistant</h1>
            <p className="text-xs text-zinc-500">Rutgers Business School</p>
          </div>
        </div>
      </div>
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="w-full rounded-lg bg-[#CC0033] px-3 py-2 text-sm font-medium text-white hover:bg-[#a30028]"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Recent ({threads.length}/5)
        </p>
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`group mb-1 flex items-stretch rounded-lg transition ${
              thread.id === activeThreadId
                ? "bg-zinc-50 shadow-sm ring-1 ring-zinc-200"
                : "hover:bg-zinc-50"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(thread.id)}
              className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
            >
              <p className="truncate font-medium text-zinc-800">{thread.title}</p>
              <p className="truncate text-xs text-zinc-500">
                {thread.agentLastUsed === "virtual-ta"
                  ? "Virtual TA"
                  : thread.agentLastUsed === "recommender"
                    ? "Recommender"
                    : "New"}
              </p>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread.id);
              }}
              title="Delete chat"
              aria-label={`Delete chat: ${thread.title}`}
              className={`shrink-0 px-2 text-zinc-400 transition hover:text-red-600 ${
                thread.id === activeThreadId
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 p-3">
        <a
          href="/admin"
          className="block text-center text-xs text-zinc-500 hover:text-[#CC0033]"
        >
          Context Studio →
        </a>
      </div>
    </aside>
  );
}
