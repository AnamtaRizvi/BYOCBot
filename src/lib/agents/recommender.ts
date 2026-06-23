import type { ChatMessage } from "@/types";
import { buildRecommenderContext } from "@/lib/rag/context-builder";
import { validateModuleIds, formatValidatedModules } from "@/lib/catalog/validate";
import { getModuleById } from "@/lib/catalog";
import { getOpenAIClient, getAgentModel } from "@/lib/openai/client";
import { fetchJobRequirements } from "@/lib/jobs/waterfall";
import type { RecommendedModule } from "@/types";
import { formatRecommenderIntro } from "@/lib/format-recommender-content";

function isCareerQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const careerSignals = [
    "become a",
    "work at",
    "job at",
    "career",
    "role at",
    "analyst at",
    "intern at",
    "financial analyst",
    "consultant at",
    "engineer at",
    " modules for ",
    "what should i take to",
    "prepare for",
  ];
  return careerSignals.some((s) => lower.includes(s)) || /\bat\s+[A-Z]/.test(message);
}

function isPastedJD(message: string): boolean {
  return message.length > 400 && /requirements|responsibilities|qualifications/i.test(message);
}

function briefIntro(explanation: string): string {
  return formatRecommenderIntro(explanation);
}

export async function runRecommender(
  message: string,
  messages: ChatMessage[],
): Promise<{
  content: string;
  validatedModuleIds: number[];
  recommendedModules: RecommendedModule[];
  sourceUrls: string[];
}> {
  const openai = getOpenAIClient();
  const context = buildRecommenderContext();
  const careerMode = isCareerQuery(message) || isPastedJD(message);

  let jobContext = "";
  let sourceUrls: string[] = [];

  if (careerMode) {
    const jobData = await fetchJobRequirements(message);
    jobContext = jobData.requirementsText;
    sourceUrls = jobData.sourceUrls;
  }

  const systemPrompt = `You are the Module Recommender for Rutgers Business School.
You may ONLY recommend modules that exist in the catalog below.
Return a JSON object with:
- "explanation": brief intro only (1–2 sentences). Do NOT list module names, IDs, or descriptions here — the UI renders module cards separately.
- "modules": array of objects, max 5, each with:
  - "module_id": integer from catalog
  - "reason": one complete short sentence why this module fits (do not truncate)

Rules:
- NEVER invent module IDs. Only use IDs present in the catalog.
- NEVER repeat module catalog descriptions in the explanation field.
- If nothing matches well, return empty modules array and explain honestly in explanation.

Catalog and context:
${context}
${jobContext ? `\n\nJob requirements:\n${jobContext}` : ""}`;

  const history = messages.slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const completion = await openai.chat.completions.create({
    model: getAgentModel(),
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let moduleIds: number[] = [];
  let explanation = "";
  const reasonById = new Map<number, string>();

  try {
    const parsed = JSON.parse(raw) as {
      module_ids?: number[];
      modules?: Array<{ module_id?: number; reason?: string }>;
      explanation?: string;
    };
    const rawModules = parsed.modules || [];
    if (rawModules.length > 0) {
      for (const m of rawModules) {
        const id = Number(m.module_id);
        if (!Number.isNaN(id)) reasonById.set(id, m.reason || "");
      }
      moduleIds = validateModuleIds([...reasonById.keys()]);
    } else {
      moduleIds = validateModuleIds(
        (parsed.module_ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
      );
    }
    explanation = parsed.explanation || "";
  } catch {
    explanation = "I had trouble parsing recommendations. Please try rephrasing your question.";
  }

  const recommendedModules: RecommendedModule[] = moduleIds
    .map((id) => {
      const mod = getModuleById(id);
      if (!mod) return null;
      return {
        moduleId: id,
        name: mod.name,
        description: mod.description,
        reason: reasonById.get(id) || "Matches your query based on catalog content.",
      };
    })
    .filter((m): m is RecommendedModule => m !== null);

  if (recommendedModules.length === 0) {
    return {
      content: explanation || formatValidatedModules([]),
      validatedModuleIds: [],
      recommendedModules: [],
      sourceUrls,
    };
  }

  let content = briefIntro(explanation);
  if (sourceUrls.length > 0) {
    content += `\n\n**Job description sources:**\n${sourceUrls.map((u) => `- ${u}`).join("\n")}`;
  }
  if (careerMode && sourceUrls.length === 0) {
    content +=
      "\n\n_Tip: Paste a job description for more accurate career-based recommendations._";
  }

  return {
    content,
    validatedModuleIds: moduleIds,
    recommendedModules,
    sourceUrls,
  };
}
