import { getActiveContextForAgent } from "@/lib/storage/admin-sources";
import { getModuleSummariesForPrompt, getModuleTranscripts } from "@/lib/catalog";
import type { AgentTarget } from "@/types";

export function buildRecommenderContext(): string {
  const adminContext = getActiveContextForAgent("recommender");
  const catalog = getModuleSummariesForPrompt();
  const parts = [
    "## Module Catalog (closed set — recommend IDs from this list only)",
    catalog,
  ];
  if (adminContext) {
    parts.push("## Additional admin context", adminContext);
  }
  return parts.join("\n\n");
}

export function buildTAContext(moduleId: number): string {
  const adminContext = getActiveContextForAgent("virtual-ta");
  const transcripts = getModuleTranscripts(moduleId);
  const parts = [
    "## Lecture transcripts for selected module (answer ONLY from this content)",
    transcripts || "No transcripts available for this module.",
  ];
  if (adminContext) {
    parts.push("## Additional admin context", adminContext);
  }
  return parts.join("\n\n");
}

export function buildAgentContext(agent: AgentTarget, moduleId?: number): string {
  if (agent === "recommender") return buildRecommenderContext();
  if (!moduleId) return buildTAContext(-1);
  return buildTAContext(moduleId);
}
