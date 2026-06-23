import type { ChatMessage, ChatResponse, SessionState } from "@/types";

export interface CallLLMOptions {
  threadId: string;
  messages: ChatMessage[];
  sessionState: SessionState;
}

const MOCK_RESPONSES: Record<string, Partial<ChatResponse>> = {
  default: {
    agent: "recommender",
    intent: "RECOMMENDATION",
    content: "Here are modules that match your interest in auditing.",
    recommendedModules: [
      {
        moduleId: 10,
        name: "Basics of Continuous Auditing and Continuous Monitoring",
        description:
          "Introductory overview of the continuous auditing framework, stages, and processes.",
        reason: "Core catalog match for continuous auditing topics.",
      },
    ],
    sessionState: {},
  },
};

export async function callLLM(options: CallLLMOptions): Promise<ChatResponse> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_LLM === "true";

  if (useMock) {
    await new Promise((r) => setTimeout(r, 600));
    const mock = MOCK_RESPONSES.default;
    return {
      agent: mock.agent!,
      intent: mock.intent!,
      content: mock.content!,
      recommendedModules: mock.recommendedModules,
      sessionState: options.sessionState,
    };
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  return res.json() as Promise<ChatResponse>;
}
