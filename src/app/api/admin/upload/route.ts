import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";
import { addSource, getUploadsDir } from "@/lib/storage/admin-sources";
import { estimateTokens } from "@/lib/tokens";
import type { AgentTarget } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const agent = (formData.get("agent") as AgentTarget) || "recommender";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let filePath: string | undefined;

    if (!process.env.VERCEL) {
      const uploadsDir = getUploadsDir();
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      filePath = join(uploadsDir, safeName);
      writeFileSync(filePath, buffer);
    }

    let content = "";
    let estimatedTokens = 0;
    let serverProcessing = false;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      content = parsed.text;
      estimatedTokens = estimateTokens(content);
      serverProcessing = true;
    } else if (ext === "csv" || ext === "json") {
      content = buffer.toString("utf-8");
      estimatedTokens = estimateTokens(content);
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const source = addSource({
      name: file.name,
      type: ext as "csv" | "json" | "pdf",
      agent,
      size: buffer.length,
      estimatedTokens,
      estimatedChunks: 1,
      active: true,
      canonical: false,
      content,
      filePath,
      serverProcessing,
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
