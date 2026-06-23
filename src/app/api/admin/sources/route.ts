import { NextRequest, NextResponse } from "next/server";
import type { AgentTarget } from "@/types";
import {
  listSources,
  addSource,
  updateSource,
  deleteSource,
  resetCustomSources,
  getActiveTokenCount,
} from "@/lib/storage/admin-sources";
import { getContextBudget } from "@/lib/openai/client";

export async function GET(req: NextRequest) {
  const agent = (req.nextUrl.searchParams.get("agent") ||
    "recommender") as AgentTarget;
  const sources = listSources(agent);
  const activeTokens = getActiveTokenCount(agent);
  const budget = getContextBudget();

  return NextResponse.json({ sources, activeTokens, budget });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "reset") {
    resetCustomSources(body.agent as AgentTarget | undefined);
    return NextResponse.json({ ok: true });
  }

  const source = addSource(body);
  return NextResponse.json({ source });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const updated = updateSource(body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  return NextResponse.json({ source: updated });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const ok = deleteSource(id);
  if (!ok) {
    return NextResponse.json({ error: "Cannot delete source" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
