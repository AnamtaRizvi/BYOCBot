import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/types";
import { classifyIntent, getUnknownClarifier } from "@/lib/agents/router";
import { runRecommender } from "@/lib/agents/recommender";
import { runVirtualTA } from "@/lib/agents/virtual-ta";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { messages, sessionState } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const latest = messages[messages.length - 1];
    if (latest.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }

    const intent = await classifyIntent(latest.content, messages);

    if (intent === "UNKNOWN") {
      const response: ChatResponse = {
        agent: "recommender",
        intent,
        content: getUnknownClarifier(),
        sessionState,
      };
      return NextResponse.json(response);
    }

    if (intent === "RECOMMENDATION") {
      const result = await runRecommender(latest.content, messages);
      const response: ChatResponse = {
        agent: "recommender",
        intent,
        content: result.content,
        sourceUrls: result.sourceUrls,
        validatedModuleIds: result.validatedModuleIds,
        recommendedModules: result.recommendedModules,
        sessionState,
      };
      return NextResponse.json(response);
    }

    const taResult = await runVirtualTA(latest.content, messages, sessionState);
    const response: ChatResponse = {
      agent: "virtual-ta",
      intent,
      content: taResult.content,
      modulePicker: taResult.modulePicker,
      sessionState: taResult.sessionState,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
