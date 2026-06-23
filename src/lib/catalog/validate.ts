import { getModuleById, getValidModuleIds } from "@/lib/catalog";

export function validateModuleIds(ids: number[]): number[] {
  const valid = getValidModuleIds();
  return [...new Set(ids.filter((id) => valid.has(id)))];
}

export function formatValidatedModules(ids: number[]): string {
  if (ids.length === 0) {
    return "I couldn't find any catalog modules that match your request. The best answer may not be in our module catalog — I won't suggest modules that don't exist here.";
  }

  const lines = ids.map((id) => {
    const mod = getModuleById(id);
    return mod ? `- **${mod.name}** (ID: ${id})` : `- Module ID ${id}`;
  });

  return lines.join("\n");
}
