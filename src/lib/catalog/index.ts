import { readFileSync } from "fs";
import { join } from "path";
import type { CatalogData, CatalogModule } from "@/types";

let cachedCatalog: CatalogData | null = null;

function loadCatalog(): CatalogData {
  if (cachedCatalog) return cachedCatalog;
  const catalogPath = join(process.cwd(), "data", "catalog.json");
  const raw = readFileSync(catalogPath, "utf-8");
  cachedCatalog = JSON.parse(raw) as CatalogData;
  return cachedCatalog;
}

export function getAllModules(): CatalogModule[] {
  return loadCatalog().modules;
}

export function getModuleById(moduleId: number): CatalogModule | undefined {
  return getAllModules().find((m) => m.module_id === moduleId);
}

export function getValidModuleIds(): Set<number> {
  return new Set(getAllModules().map((m) => m.module_id));
}

export function getModuleSummariesForPrompt(): string {
  return getAllModules()
    .map((m) => {
      const lectureTitles = m.lectures
        .map((l) => l.lecture_name)
        .join("; ");
      return `ID: ${m.module_id}\nName: ${m.name}\nDescription: ${m.description}\nLectures: ${lectureTitles}`;
    })
    .join("\n\n---\n\n");
}

export function getModuleTranscripts(moduleId: number): string {
  const catalogModule = getModuleById(moduleId);
  if (!catalogModule) return "";

  return catalogModule.lectures
    .filter((l) => l.transcript?.available && l.transcript.text)
    .map(
      (l) =>
        `## Lecture: ${l.lecture_name}\n\n${l.transcript!.text}`,
    )
    .join("\n\n---\n\n");
}

export function getModulePickerOptions() {
  return getAllModules().map((m) => ({
    moduleId: m.module_id,
    name: m.name,
    pickerKey: `pdf-${m.pdf_number}`,
  }));
}

export function getCatalogStats() {
  const catalog = loadCatalog();
  const totalLectures = catalog.modules.reduce(
    (sum, m) => sum + m.lectures.length,
    0,
  );
  const lecturesWithTranscript = catalog.modules.reduce(
    (sum, m) =>
      sum +
      m.lectures.filter((l) => l.transcript?.available && l.transcript.text)
        .length,
    0,
  );
  return {
    modules: catalog.metadata.stats.modules,
    totalLectures,
    lecturesWithTranscript,
  };
}
