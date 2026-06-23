import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { AdminSource, AgentTarget } from "@/types";
import { getModuleSummariesForPrompt, getCatalogStats } from "@/lib/catalog";
import { estimateTokens } from "@/lib/tokens";

function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_VERSION ||
      process.env.AWS_EXECUTION_ENV,
  );
}

function getStorageRoot(): string {
  if (isServerless()) {
    return join("/tmp", "byoc-assistant-storage");
  }
  return join(process.cwd(), "storage");
}

function getSourcesFile(): string {
  return join(getStorageRoot(), "sources.json");
}

function getUploadsDirPath(): string {
  return join(getStorageRoot(), "uploads");
}

function ensureStorage() {
  const root = getStorageRoot();
  const sourcesFile = getSourcesFile();
  const uploadsDir = getUploadsDirPath();

  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  if (!existsSync(sourcesFile)) {
    writeFileSync(sourcesFile, JSON.stringify({ sources: [] }, null, 2));
  }
}

function readSources(): AdminSource[] {
  try {
    ensureStorage();
    const raw = readFileSync(getSourcesFile(), "utf-8");
    const data = JSON.parse(raw) as { sources: AdminSource[] };
    return data.sources;
  } catch {
    return [];
  }
}

function writeSources(sources: AdminSource[]) {
  ensureStorage();
  writeFileSync(getSourcesFile(), JSON.stringify({ sources }, null, 2));
}

function getCanonicalSources(agent: AgentTarget): AdminSource[] {
  const stats = getCatalogStats();
  if (agent === "recommender") {
    const catalogText = getModuleSummariesForPrompt();
    return [
      {
        id: "canonical-catalog",
        name: "Module Catalog",
        type: "json",
        agent: "recommender",
        size: catalogText.length,
        estimatedTokens: estimateTokens(catalogText),
        estimatedChunks: 1,
        dateAdded: "2026-01-01T00:00:00.000Z",
        active: true,
        canonical: true,
        content: catalogText,
      },
    ];
  }

  return [
    {
      id: "canonical-transcripts",
      name: "Lecture Transcripts",
      type: "json",
      agent: "virtual-ta",
      size: 0,
      estimatedTokens: 15000,
      estimatedChunks: 1,
      dateAdded: "2026-01-01T00:00:00.000Z",
      active: true,
      canonical: true,
      serverProcessing: true,
      content: `Canonical lecture transcripts for all ${stats.modules} modules (${stats.lecturesWithTranscript} lectures with transcripts). Loaded per selected module at query time.`,
    },
  ];
}

export function listSources(agent: AgentTarget): AdminSource[] {
  const custom = readSources().filter((s) => s.agent === agent);
  return [...getCanonicalSources(agent), ...custom];
}

export function addSource(source: Omit<AdminSource, "id" | "dateAdded">) {
  const sources = readSources();
  const newSource: AdminSource = {
    ...source,
    id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dateAdded: new Date().toISOString(),
    canonical: false,
  };
  sources.push(newSource);
  writeSources(sources);
  return newSource;
}

export function updateSource(
  id: string,
  patch: Partial<Pick<AdminSource, "active" | "name" | "content" | "estimatedTokens">>,
) {
  const sources = readSources();
  const index = sources.findIndex((s) => s.id === id);
  if (index === -1) return null;
  sources[index] = { ...sources[index], ...patch };
  writeSources(sources);
  return sources[index];
}

export function deleteSource(id: string): boolean {
  const sources = readSources();
  const target = sources.find((s) => s.id === id);
  if (!target || target.canonical) return false;
  writeSources(sources.filter((s) => s.id !== id));
  return true;
}

export function resetCustomSources(agent?: AgentTarget) {
  const sources = readSources().filter((s) => {
    if (agent) return s.agent !== agent;
    return false;
  });
  writeSources(sources);
}

export function getUploadsDir() {
  ensureStorage();
  return getUploadsDirPath();
}

export function getActiveContextForAgent(agent: AgentTarget): string {
  const sources = listSources(agent).filter((s) => s.active && s.content);
  if (sources.length === 0) return "";
  return sources
    .map((s) => `### Source: ${s.name}\n${s.content}`)
    .join("\n\n---\n\n");
}

export function getActiveTokenCount(agent: AgentTarget): number {
  return listSources(agent)
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.estimatedTokens, 0);
}

export function isEphemeralStorage(): boolean {
  return isServerless();
}
