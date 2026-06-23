export type Intent = "RECOMMENDATION" | "QUESTION" | "UNKNOWN";
export type AgentType = "recommender" | "virtual-ta";

export interface RecommendedModule {
  moduleId: number;
  name: string;
  description: string;
  reason: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agent?: AgentType;
  intent?: Intent;
  sourceUrls?: string[];
  validatedModuleIds?: number[];
  recommendedModules?: RecommendedModule[];
  modulePicker?: ModulePickerOption[];
}

export interface SessionState {
  selectedModuleId?: number;
}

export interface ModulePickerOption {
  moduleId: number;
  name: string;
  pickerKey?: string;
}

export interface Thread {
  id: string;
  title: string;
  lastMessageAt: number;
  agentLastUsed?: AgentType;
  messages: ChatMessage[];
  sessionState: SessionState;
}

export interface CatalogLecture {
  lecture_id: number;
  lecture_name: string;
  transcript?: {
    available: boolean;
    source_file?: string;
    text?: string;
  };
}

export interface CatalogModule {
  pdf_number: number;
  module_id: number;
  name: string;
  description: string;
  lectures: CatalogLecture[];
}

export interface CatalogData {
  metadata: {
    stats: { modules: number };
  };
  modules: CatalogModule[];
}

export type SourceType = "csv" | "json" | "pdf";
export type AgentTarget = "recommender" | "virtual-ta";

export interface AdminSource {
  id: string;
  name: string;
  type: SourceType;
  agent: AgentTarget;
  size: number;
  estimatedTokens: number;
  estimatedChunks: number;
  dateAdded: string;
  active: boolean;
  canonical: boolean;
  content?: string;
  filePath?: string;
  serverProcessing?: boolean;
}

export interface ChatRequest {
  threadId: string;
  messages: ChatMessage[];
  sessionState: SessionState;
}

export interface ChatResponse {
  agent: AgentType;
  intent: Intent;
  content: string;
  sourceUrls?: string[];
  validatedModuleIds?: number[];
  recommendedModules?: RecommendedModule[];
  modulePicker?: ModulePickerOption[];
  sessionState: SessionState;
}
