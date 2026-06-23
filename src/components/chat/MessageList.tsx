"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { ChatMessage } from "@/types";
import { AgentPill } from "./AgentPill";
import { ModulePicker } from "./ModulePicker";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onModuleSelect: (moduleId: number, name: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  onModuleSelect,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8f9fa] px-4 py-6">
      {messages.length === 0 && (
        <div className="mx-auto max-w-2xl text-center text-zinc-500">
          <Image
            src="/rutgers-logo.png"
            alt="Rutgers logo"
            width={72}
            height={72}
            priority
            unoptimized
            className="mx-auto mb-4 h-18 w-18 object-contain"
          />
          <h2 className="mb-2 text-2xl font-semibold text-zinc-900">
            BYOC Academic Assistant
          </h2>
          <p className="text-sm text-zinc-600">
            Ask for module recommendations or questions about lecture content.
            I&apos;ll route you to the right specialist.
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          className={`mx-auto flex max-w-2xl ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-[#CC0033] text-white"
                : "bg-white shadow-sm ring-1 ring-zinc-200"
            }`}
          >
            {msg.role === "assistant" && msg.agent && (
              <div className="mb-2">
                <AgentPill agent={msg.agent} />
              </div>
            )}
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {msg.content}
            </div>
            {msg.modulePicker && msg.modulePicker.length > 0 && (
              <ModulePicker
                options={msg.modulePicker}
                onSelect={onModuleSelect}
              />
            )}
            {msg.sourceUrls && msg.sourceUrls.length > 0 && (
              <div className="mt-3 border-t border-zinc-200 pt-2 text-xs">
                <p className="mb-1 font-medium text-zinc-700">Sources</p>
                {msg.sourceUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[#CC0033] hover:underline"
                  >
                    {url}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#CC0033] [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#CC0033] [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#CC0033]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
