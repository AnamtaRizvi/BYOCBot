"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, ChatResponse, Thread } from "@/types";
import { createThread, upsertThread } from "@/lib/threads";
import { persistThreads, useThreadsStore } from "@/lib/use-threads-store";
import { ThreadSidebar } from "./ThreadSidebar";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

export function ChatApp() {
  const threads = useThreadsStore();
  const [activeThreadId, setActiveThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resolvedActiveId = activeThreadId || threads[0]?.id || "";
  const activeThread = threads.find((t) => t.id === resolvedActiveId);

  const updateThread = useCallback(
    (updated: Thread) => {
      persistThreads(upsertThread([...threads], updated));
    },
    [threads],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeThread) return;

      const userMessage: ChatMessage = { role: "user", content };
      const withUser: Thread = {
        ...activeThread,
        messages: [...activeThread.messages, userMessage],
        lastMessageAt: Date.now(),
        title:
          activeThread.messages.length === 0
            ? content.slice(0, 48) + (content.length > 48 ? "…" : "")
            : activeThread.title,
      };
      updateThread(withUser);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: withUser.id,
            messages: withUser.messages,
            sessionState: withUser.sessionState,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Request failed");
        }

        const data = (await res.json()) as ChatResponse;
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content,
          agent: data.agent,
          intent: data.intent,
          sourceUrls: data.sourceUrls,
          validatedModuleIds: data.validatedModuleIds,
          modulePicker: data.modulePicker,
        };

        updateThread({
          ...withUser,
          messages: [...withUser.messages, assistantMessage],
          sessionState: data.sessionState,
          agentLastUsed: data.agent,
          lastMessageAt: Date.now(),
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Something went wrong";
        updateThread({
          ...withUser,
          messages: [
            ...withUser.messages,
            { role: "assistant", content: `Error: ${errMsg}` },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeThread, updateThread],
  );

  const handleModuleSelect = useCallback(
    (moduleId: number, name: string) => {
      sendMessage(`I'd like to ask about module ${moduleId}: ${name}`);
    },
    [sendMessage],
  );

  const handleNewThread = () => {
    const fresh = createThread();
    persistThreads([fresh, ...threads]);
    setActiveThreadId(fresh.id);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
  };

  const handleDeleteThread = (id: string) => {
    const remaining = threads.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const fresh = createThread();
      persistThreads([fresh]);
      setActiveThreadId(fresh.id);
      return;
    }
    persistThreads(remaining);
    if (resolvedActiveId === id) {
      setActiveThreadId(remaining[0].id);
    }
  };

  if (!activeThread) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa]">
      <ThreadSidebar
        threads={threads}
        activeThreadId={resolvedActiveId}
        onSelect={handleSelectThread}
        onNew={handleNewThread}
        onDelete={handleDeleteThread}
      />
      <main className="flex flex-1 flex-col">
        <MessageList
          messages={activeThread.messages}
          isLoading={isLoading}
          onModuleSelect={handleModuleSelect}
        />
        <Composer onSend={sendMessage} disabled={isLoading} />
      </main>
    </div>
  );
}
