import type { AgentType } from "@/types";

const AGENT_CONFIG: Record<
  AgentType,
  { label: string; color: string; tooltip: string; icon: string }
> = {
  recommender: {
    label: "Module Recommender",
    color: "bg-[#CC0033] text-white",
    tooltip: "Web search on · catalog-only",
    icon: "📚",
  },
  "virtual-ta": {
    label: "Virtual TA",
    color: "bg-[#1B4D3E] text-white",
    tooltip: "Web search off · lectures only",
    icon: "🎓",
  },
};

export function AgentPill({ agent }: { agent: AgentType }) {
  const config = AGENT_CONFIG[agent];
  return (
    <span
      title={config.tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
