"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  AgentType,
  ChatMessage,
  ModulePickerOption,
  RecommendedModule,
  Thread,
} from "@/types";
import { callLLM } from "@/lib/callLLM";
import { displayAssistantContent } from "@/lib/format-recommender-content";
import { createThread, upsertThread } from "@/lib/threads";
import { persistThreads, useThreadsStore } from "@/lib/use-threads-store";
import { useSpeechSupported } from "@/lib/use-speech-supported";

/* ─── constants ─── */

const EXAMPLE_PROMPTS = [
  "What modules cover continuous auditing?",
  "What should I take to become a financial analyst?",
  "Modules about artificial intelligence in business",
  "Explain the continuous auditing framework",
];

const CARD_PALETTE = [
  { bar: "bg-indigo-500", tint: "bg-indigo-50", icon: "📊", text: "text-indigo-700" },
  { bar: "bg-teal-500", tint: "bg-teal-50", icon: "🔬", text: "text-teal-700" },
  { bar: "bg-amber-500", tint: "bg-amber-50", icon: "⚡", text: "text-amber-700" },
  { bar: "bg-rose-500", tint: "bg-rose-50", icon: "📈", text: "text-rose-700" },
  { bar: "bg-emerald-500", tint: "bg-emerald-50", icon: "🎯", text: "text-emerald-700" },
];

const AGENT_META: Record<
  AgentType,
  { label: string; role: string; constraint: string; accent: string; border: string }
> = {
  recommender: {
    label: "Module Recommender",
    role: "Finds catalog modules that match your goals and interests",
    constraint: "Web on",
    accent: "bg-indigo-600",
    border: "border-indigo-200",
  },
  "virtual-ta": {
    label: "Virtual TA",
    role: "Answers from one module's lecture transcripts only",
    constraint: "Sealed · lectures only",
    accent: "bg-emerald-700",
    border: "border-emerald-200",
  },
};

/* ─── markdown ─── */

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-assistant text-sm text-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

/* ─── module recommendation cards ─── */

function ModuleCard({
  mod,
  colorIndex,
  onAskTA,
}: {
  mod: RecommendedModule;
  colorIndex: number;
  onAskTA: (moduleId: number, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const palette = CARD_PALETTE[colorIndex % CARD_PALETTE.length];

  return (
    <article
      className="group flex overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:border-zinc-300 focus-within:ring-2 focus-within:ring-[#CC0033]/30"
    >
      <div className={`w-1 shrink-0 ${palette.bar}`} aria-hidden />
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-2 flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg ${palette.tint}`}
            aria-hidden
          >
            {palette.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-mono-id mb-1 inline-block rounded bg-[#CC0033]/10 px-1.5 py-0.5 text-xs font-medium text-[#CC0033]">
              #{mod.moduleId}
            </span>
            <h3 className="font-semibold leading-snug text-zinc-900">{mod.name}</h3>
            <p className={`mt-1 text-xs ${palette.text}`}>{mod.reason}</p>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <p className="border-t border-zinc-100 pt-3 text-sm leading-relaxed text-zinc-600">
              {mod.description}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            {expanded ? "Show less" : "Full description"}
          </button>
          <button
            type="button"
            onClick={() => onAskTA(mod.moduleId, mod.name)}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Ask the TA about this →
          </button>
        </div>
      </div>
    </article>
  );
}

function ModuleCardGrid({
  modules,
  onAskTA,
}: {
  modules: RecommendedModule[];
  onAskTA: (moduleId: number, name: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-1">
      {modules.map((mod, i) => (
        <ModuleCard key={`${mod.moduleId}-${i}`} mod={mod} colorIndex={i} onAskTA={onAskTA} />
      ))}
    </div>
  );
}

/* ─── searchable TA module grid ─── */

function SearchableModuleGrid({
  options,
  onSelect,
}: {
  options: ModulePickerOption[];
  onSelect: (moduleId: number, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter(
    (o) =>
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      String(o.moduleId).includes(query),
  );

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search modules by name or #ID…"
        className="mb-3 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
      <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
        {filtered.map((opt, index) => (
          <button
            key={opt.pickerKey ?? `${opt.moduleId}-${index}-${opt.name}`}
            type="button"
            onClick={() => onSelect(opt.moduleId, opt.name)}
            className="rounded-md border border-transparent bg-white px-3 py-2 text-left text-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <span className="font-mono-id text-xs font-medium text-[#CC0033]">
              #{opt.moduleId}
            </span>
            <span className="mt-0.5 block text-zinc-800">{opt.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 py-4 text-center text-sm text-zinc-500">No modules match.</p>
        )}
      </div>
    </div>
  );
}

/* ─── agent header band ─── */

function AgentHeader({ agent }: { agent: AgentType }) {
  const meta = AGENT_META[agent];
  return (
    <div
      className={`border-b px-4 py-3 transition-colors ${meta.border} ${agent === "recommender" ? "bg-indigo-50/80" : "bg-emerald-50/80"}`}
    >
      <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${meta.accent}`} />
            <span className="font-display text-sm font-semibold text-zinc-900">
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-600">{meta.role}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${meta.accent}`}
        >
          {meta.constraint}
        </span>
      </div>
    </div>
  );
}

/* ─── hero empty state ─── */

function HeroEmpty({ onChipClick }: { onChipClick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center animate-fade-up">
      <Image
        src="/rutgers-logo.png"
        alt="Rutgers"
        width={80}
        height={80}
        priority
        unoptimized
        className="mb-4 h-20 w-20 object-contain"
      />
      <h2 className="font-display text-2xl font-semibold text-zinc-900">BYOC Assistant</h2>
      <p className="mt-1 text-sm text-zinc-500">Rutgers Business School</p>
      <p className="mt-4 max-w-md text-sm text-zinc-600">
        Ask for module recommendations or questions about lecture content.
      </p>
      <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onChipClick(prompt)}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 transition hover:border-[#CC0033]/40 hover:bg-[#CC0033]/5 focus:outline-none focus:ring-2 focus:ring-[#CC0033]/30"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── typing indicator ─── */

function TypingIndicator() {
  return (
    <div className="mx-auto max-w-[720px] px-4">
      <div className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
      </div>
    </div>
  );
}

/* ─── sidebar ─── */

function Sidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: {
  threads: Thread[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#18181b] text-zinc-100 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <Image
              src="/rutgers-logo.png"
              alt="Rutgers"
              width={36}
              height={36}
              priority
              unoptimized
              className="h-9 w-9 object-contain"
            />
            <div>
              <p className="font-display text-sm font-semibold text-white">BYOC Assistant</p>
              <p className="text-xs text-zinc-500">Rutgers Business School</p>
            </div>
          </div>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNew();
              onClose();
            }}
            className="w-full rounded-lg bg-[#CC0033] px-3 py-2 text-sm font-medium text-white hover:bg-[#a30028] focus:outline-none focus:ring-2 focus:ring-[#CC0033]/50"
          >
            + New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Recent ({threads.length}/5)
          </p>
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`group mb-1 flex items-stretch rounded-lg ${
                thread.id === activeId ? "bg-zinc-800" : "hover:bg-zinc-800/60"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(thread.id);
                  onClose();
                }}
                className="min-w-0 flex-1 px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#CC0033]/50"
              >
                <p className="truncate font-medium text-zinc-100">{thread.title}</p>
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
                aria-label={`Delete ${thread.title}`}
                className={`shrink-0 px-2 text-zinc-500 hover:text-red-400 focus:outline-none ${
                  thread.id === activeId ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-zinc-800 p-3">
          <a
            href="/admin"
            className="block text-center text-xs text-zinc-500 hover:text-[#CC0033] focus:outline-none focus:underline"
          >
            Context Studio →
          </a>
        </div>
      </aside>
    </>
  );
}

/* ─── composer ─── */

function Composer({
  onSend,
  disabled,
  draft,
  onDraftChange,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
}) {
  const speechSupported = useSpeechSupported();
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalText = draft;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += (finalText ? " " : "") + t;
        else interim += t;
      }
      onDraftChange(finalText + (interim ? " " + interim : ""));
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [draft, onDraftChange]);

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    onDraftChange("");
  };

  const hasText = draft.trim().length > 0;

  return (
    <div className="border-t border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[720px] items-end gap-2 px-4 py-3">
        {speechSupported && (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            title={isRecording ? "Stop recording" : "Voice input"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-[#CC0033]/40 ${
              isRecording
                ? "animate-pulse border-red-300 bg-red-50 text-red-600"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {isRecording ? "⏹" : "🎤"}
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about modules or lecture content…"
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#CC0033] focus:ring-1 focus:ring-[#CC0033]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !hasText}
          className={`h-10 shrink-0 rounded-xl px-5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#CC0033]/40 ${
            hasText && !disabled
              ? "bg-[#CC0033] text-white hover:bg-[#a30028]"
              : "bg-zinc-100 text-zinc-400"
          }`}
        >
          Send
        </button>
      </div>
      {isRecording && (
        <p className="mx-auto max-w-[720px] pb-2 text-center text-xs text-red-600">
          Recording… review before sending.
        </p>
      )}
    </div>
  );
}

/* ─── main export ─── */

export function BYOCChat() {
  const threads = useThreadsStore();
  const [activeThreadId, setActiveThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const resolvedActiveId = activeThreadId || threads[0]?.id || "";
  const activeThread = threads.find((t) => t.id === resolvedActiveId);
  const lastAgent: AgentType =
    activeThread?.agentLastUsed ||
    (activeThread?.messages.filter((m) => m.agent).at(-1)?.agent ?? "recommender");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeThread?.messages, isLoading]);

  const updateThread = useCallback(
    (updated: Thread) => {
      persistThreads(upsertThread([...threads], updated));
    },
    [threads],
  );

  const sendMessage = useCallback(
    async (content: string, sessionOverride?: { selectedModuleId?: number }) => {
      if (!activeThread) return;

      const sessionState = {
        ...activeThread.sessionState,
        ...sessionOverride,
      };

      const userMessage: ChatMessage = { role: "user", content };
      const withUser: Thread = {
        ...activeThread,
        messages: [...activeThread.messages, userMessage],
        sessionState,
        lastMessageAt: Date.now(),
        title:
          activeThread.messages.length === 0
            ? content.slice(0, 48) + (content.length > 48 ? "…" : "")
            : activeThread.title,
      };
      updateThread(withUser);
      setIsLoading(true);
      setComposerDraft("");

      try {
        const data = await callLLM({
          threadId: withUser.id,
          messages: withUser.messages,
          sessionState: withUser.sessionState,
        });

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content,
          agent: data.agent,
          intent: data.intent,
          sourceUrls: data.sourceUrls,
          recommendedModules: data.recommendedModules,
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
        const errMsg = error instanceof Error ? error.message : "Something went wrong";
        updateThread({
          ...withUser,
          messages: [
            ...withUser.messages,
            { role: "assistant", content: `Error: ${errMsg}`, agent: lastAgent },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeThread, lastAgent, updateThread],
  );

  const handleAskTA = useCallback(
    (moduleId: number, name: string) => {
      if (!activeThread) return;
      const updated: Thread = {
        ...activeThread,
        sessionState: { selectedModuleId: moduleId },
        agentLastUsed: "virtual-ta",
      };
      updateThread(updated);
      sendMessage(
        `I'd like to ask about module ${moduleId}: ${name}. Give me an overview from the lectures.`,
        { selectedModuleId: moduleId },
      );
    },
    [activeThread, sendMessage, updateThread],
  );

  const handleModulePick = useCallback(
    (moduleId: number, name: string) => {
      sendMessage(`Module ${moduleId}: ${name}`, { selectedModuleId: moduleId });
    },
    [sendMessage],
  );

  const handleNewThread = () => {
    const fresh = createThread();
    persistThreads([fresh, ...threads]);
    setActiveThreadId(fresh.id);
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
    if (resolvedActiveId === id) setActiveThreadId(remaining[0].id);
  };

  if (!activeThread) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f7] text-zinc-500">
        Loading…
      </div>
    );
  }

  const showHero = activeThread.messages.length === 0 && !isLoading;

  return (
    <div className="flex h-screen bg-[#faf9f7]">
      <Sidebar
        threads={threads}
        activeId={resolvedActiveId}
        onSelect={setActiveThreadId}
        onNew={handleNewThread}
        onDelete={handleDeleteThread}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0033]/40"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-display text-sm font-semibold text-zinc-900">BYOC Assistant</span>
        </div>

        {!showHero && <AgentHeader agent={lastAgent} />}

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {showHero ? (
            <HeroEmpty onChipClick={(text) => sendMessage(text)} />
          ) : (
            <div className="mx-auto max-w-[720px] space-y-4 px-4 py-6">
              {activeThread.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`animate-fade-up flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3 text-sm leading-relaxed text-white">
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={`max-w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 ${
                        msg.agent === "virtual-ta" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-indigo-500"
                      }`}
                    >
                      {(() => {
                        const body = displayAssistantContent(
                          msg.content,
                          msg.recommendedModules,
                        );
                        return body.trim() ? <AssistantMarkdown content={body} /> : null;
                      })()}
                      {msg.recommendedModules && msg.recommendedModules.length > 0 && (
                        <ModuleCardGrid modules={msg.recommendedModules} onAskTA={handleAskTA} />
                      )}
                      {msg.modulePicker && msg.modulePicker.length > 0 && (
                        <SearchableModuleGrid
                          options={msg.modulePicker}
                          onSelect={handleModulePick}
                        />
                      )}
                      {msg.sourceUrls && msg.sourceUrls.length > 0 && (
                        <div className="mt-3 border-t border-zinc-100 pt-2">
                          <p className="mb-1 text-xs font-medium text-zinc-600">Sources</p>
                          {msg.sourceUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-xs text-[#CC0033] hover:underline"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && <TypingIndicator />}
            </div>
          )}
        </div>

        <Composer
          onSend={sendMessage}
          disabled={isLoading}
          draft={composerDraft}
          onDraftChange={setComposerDraft}
        />
      </div>
    </div>
  );
}
