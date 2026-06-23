import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function getRouterModel(): string {
  return process.env.ROUTER_MODEL || "gpt-4.1-mini";
}

export function getAgentModel(): string {
  return process.env.AGENT_MODEL || "gpt-4.1";
}

export function getContextBudget(): number {
  return Number(process.env.CONTEXT_BUDGET || "100000");
}
