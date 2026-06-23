import type { ChatMessage, ModulePickerOption, SessionState } from "@/types";
import { buildTAContext } from "@/lib/rag/context-builder";
import { getModuleById, getModulePickerOptions } from "@/lib/catalog";
import { getOpenAIClient, getAgentModel } from "@/lib/openai/client";

function detectModuleSelection(
  message: string,
  sessionState: SessionState,
): SessionState {
  if (sessionState.selectedModuleId) return sessionState;

  const options = getModulePickerOptions();
  const lower = message.toLowerCase();

  for (const opt of options) {
    if (lower.includes(opt.name.toLowerCase())) {
      return { selectedModuleId: opt.moduleId };
    }
    if (lower === String(opt.moduleId)) {
      return { selectedModuleId: opt.moduleId };
    }
  }

  const idMatch = message.match(/\b(?:module\s*)?#?(\d{1,3})\b/i);
  if (idMatch) {
    const id = Number(idMatch[1]);
    if (getModuleById(id)) return { selectedModuleId: id };
  }

  return sessionState;
}

export async function runVirtualTA(
  message: string,
  messages: ChatMessage[],
  sessionState: SessionState,
): Promise<{
  content: string;
  modulePicker?: ModulePickerOption[];
  sessionState: SessionState;
}> {
  const updatedState = detectModuleSelection(message, sessionState);

  if (!updatedState.selectedModuleId) {
    return {
      content:
        "Which module would you like to ask about? Select one below — I'll answer using only that module's lecture transcripts.",
      modulePicker: getModulePickerOptions(),
      sessionState: updatedState,
    };
  }

  const catalogModule = getModuleById(updatedState.selectedModuleId);
  if (!catalogModule) {
    return {
      content: "That module wasn't found in the catalog. Please pick another module.",
      modulePicker: getModulePickerOptions(),
      sessionState: { selectedModuleId: undefined },
    };
  }

  const openai = getOpenAIClient();
  const context = buildTAContext(updatedState.selectedModuleId);

  const systemPrompt = `You are the Virtual TA for Rutgers Business School module: "${catalogModule.name}".
You have NO web access. Answer ONLY from the lecture transcripts provided.
Rules:
- If the answer is not in the transcripts, say exactly: "That isn't covered in this module's lectures."
- Always cite which lecture your answer draws from.
- Be clear, accurate, and student-friendly.
- Do not use outside knowledge beyond the transcripts.

${context}`;

  const history = messages.slice(-12).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const completion = await openai.chat.completions.create({
    model: getAgentModel(),
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
  });

  const content =
    completion.choices[0]?.message?.content ||
    "I couldn't generate a response. Please try again.";

  return { content, sessionState: updatedState };
}
