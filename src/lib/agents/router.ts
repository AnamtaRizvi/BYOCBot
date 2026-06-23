import { z } from "zod";
import type { ChatMessage, Intent } from "@/types";
import { getOpenAIClient, getRouterModel } from "@/lib/openai/client";

const intentSchema = z.object({
  intent: z.enum(["RECOMMENDATION", "QUESTION", "UNKNOWN"]),
});

const RECOMMENDATION_PATTERNS = [
  /\bwhat modules\b/i,
  /\bwhich modules\b/i,
  /\bmodules (cover|about|on|for|teach|related to|that cover)\b/i,
  /\bmodule recommendations?\b/i,
  /\bwhat should i take\b/i,
  /\bwhat (courses|classes) should i take\b/i,
  /\brecommend (modules|courses)\b/i,
  /\bmodules to (take|learn|study)\b/i,
  /\bsuggest (modules|courses)\b/i,
  /\bprepare (me )?for (a career|a role|working)\b/i,
  /\bmodules for (a |my )?(career|job|role|internship)\b/i,
  /\bwhat to take (next )?(semester|year)\b/i,
];

function buildSummary(messages: ChatMessage[]): string {
  const recent = messages.slice(-6);
  return recent.map((m) => `${m.role}: ${m.content}`).join("\n");
}

export function heuristicIntent(message: string): Intent | null {
  if (RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(message))) {
    return "RECOMMENDATION";
  }
  return null;
}

export async function classifyIntent(
  latestMessage: string,
  messages: ChatMessage[],
): Promise<Intent> {
  const ruleMatch = heuristicIntent(latestMessage);
  if (ruleMatch) return ruleMatch;

  const openai = getOpenAIClient();
  const summary = buildSummary(messages.slice(0, -1));

  const completion = await openai.chat.completions.create({
    model: getRouterModel(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an intent router for Rutgers Business School BYOC academic assistant.
Classify the latest user message into exactly one label:

RECOMMENDATION — user wants to find, list, or be suggested modules from the catalog. Includes:
- "what/which modules cover X", "modules about X", "modules on X", "modules for X"
- career or skill-based module suggestions ("what should I take to become…")
- browsing the catalog by topic, not asking for lecture explanations

QUESTION — user wants an explanation of concepts, definitions, or lecture content from inside a module. Includes:
- "explain X", "how does X work", "what is X" (when asking about concepts, not catalog lookup)
- follow-ups about lecture material after a module is already in context

UNKNOWN — truly ambiguous or unrelated to modules/lectures

Important: If the user asks which modules exist, match, or cover a topic → RECOMMENDATION, not QUESTION.

Return JSON only: {"intent":"RECOMMENDATION"|"QUESTION"|"UNKNOWN"}`,
      },
      {
        role: "user",
        content: `Conversation summary:\n${summary || "(new conversation)"}\n\nLatest message:\n${latestMessage}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{"intent":"UNKNOWN"}';
  try {
    const parsed = intentSchema.parse(JSON.parse(raw));
    return parsed.intent;
  } catch {
    return "UNKNOWN";
  }
}

export function getUnknownClarifier(): string {
  return "Are you looking for module recommendations, or do you have a question about a specific module's lecture content?";
}
