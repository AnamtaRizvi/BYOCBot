"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminSource, AgentTarget } from "@/types";
import { estimateTokens } from "@/lib/tokens";

export function ContextStudio() {
  const [agent, setAgent] = useState<AgentTarget>("recommender");
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [activeTokens, setActiveTokens] = useState(0);
  const [budget, setBudget] = useState(100000);
  const [loading, setLoading] = useState(true);
  const [jsonPreview, setJsonPreview] = useState("");
  const [csvPreview, setCsvPreview] = useState("");

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/sources?agent=${agent}`);
    const data = await res.json();
    setSources(data.sources);
    setActiveTokens(data.activeTokens);
    setBudget(data.budget);
    setLoading(false);
  }, [agent]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await fetch(`/api/admin/sources?agent=${agent}`);
      const data = await res.json();
      if (!active) return;
      setSources(data.sources);
      setActiveTokens(data.activeTokens);
      setBudget(data.budget);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [agent]);

  const toggleSource = async (id: string, active: boolean) => {
    await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch: { active } }),
    });
    fetchSources();
  };

  const deleteSource = async (id: string) => {
    await fetch(`/api/admin/sources?id=${id}`, { method: "DELETE" });
    fetchSources();
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("agent", agent);
    await fetch("/api/admin/upload", { method: "POST", body: formData });
    fetchSources();
  };

  const handleJsonAdd = async () => {
    if (!jsonPreview.trim()) return;
    await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `JSON source ${new Date().toLocaleDateString()}`,
        type: "json",
        agent,
        size: jsonPreview.length,
        estimatedTokens: estimateTokens(jsonPreview),
        estimatedChunks: 1,
        active: true,
        canonical: false,
        content: jsonPreview,
      }),
    });
    setJsonPreview("");
    fetchSources();
  };

  const handleCsvAdd = async () => {
    if (!csvPreview.trim()) return;
    await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `CSV source ${new Date().toLocaleDateString()}`,
        type: "csv",
        agent,
        size: csvPreview.length,
        estimatedTokens: estimateTokens(csvPreview),
        estimatedChunks: 1,
        active: true,
        canonical: false,
        content: csvPreview,
      }),
    });
    setCsvPreview("");
    fetchSources();
  };

  const handleReset = async () => {
    if (!confirm("Remove all custom sources for this agent?")) return;
    await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", agent }),
    });
    fetchSources();
  };

  const pct = Math.min(100, Math.round((activeTokens / budget) * 100));
  const overBudget = activeTokens > budget;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#CC0033]">Context Studio</h1>
            <p className="text-sm text-zinc-500">
              Manage RAG sources per agent
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-[#CC0033]">
            ← Back to chat
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex gap-2">
          {(["recommender", "virtual-ta"] as AgentTarget[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setLoading(true);
                setAgent(a);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                agent === a
                  ? "bg-[#CC0033] text-white"
                  : "bg-white ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {a === "recommender" ? "Module Recommender" : "Virtual TA"}
            </button>
          ))}
        </div>

        <div
          className={`mb-6 rounded-xl border p-4 ${
            overBudget
              ? "border-amber-300 bg-amber-50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Context budget</span>
            <span>
              {activeTokens.toLocaleString()} / {budget.toLocaleString()} tokens
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className={`h-full transition-all ${overBudget ? "bg-amber-500" : "bg-[#CC0033]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {overBudget && (
            <p className="mt-2 text-sm text-amber-700">
              Over budget — consider toggling sources off or removing uploads.
            </p>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">
            {agent === "recommender" ? (
              <>
                <strong>Web search on</strong> · catalog-only recommendations.
                Module Catalog is the protected canonical source.
              </>
            ) : (
              <>
                <strong>Sealed agent</strong> — no web access; lectures only.
                Lecture Transcripts are loaded per selected module.
              </>
            )}
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 p-6 hover:border-[#CC0033]">
            <span className="mb-2 text-2xl">📄</span>
            <span className="text-sm font-medium">Upload PDF</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
          </label>
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="mb-2 text-sm font-medium">Add JSON</p>
            <textarea
              value={jsonPreview}
              onChange={(e) => setJsonPreview(e.target.value)}
              placeholder='{"key": "value"}'
              rows={3}
              className="mb-2 w-full rounded border border-zinc-300 bg-white p-2 text-xs"
            />
            <button
              type="button"
              onClick={handleJsonAdd}
              className="text-xs text-[#CC0033] hover:underline"
            >
              Add JSON source
            </button>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="mb-2 text-sm font-medium">Add CSV</p>
            <textarea
              value={csvPreview}
              onChange={(e) => setCsvPreview(e.target.value)}
              placeholder="col1,col2&#10;val1,val2"
              rows={3}
              className="mb-2 w-full rounded border border-zinc-300 bg-white p-2 text-xs"
            />
            <button
              type="button"
              onClick={handleCsvAdd}
              className="text-xs text-[#CC0033] hover:underline"
            >
              Add CSV source
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Sources</h2>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-red-600 hover:underline"
          >
            Reset custom sources
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sources.map((src) => (
                  <tr
                    key={src.id}
                    className="border-t border-zinc-100"
                  >
                    <td className="px-4 py-3 font-medium">
                      {src.name}
                      {src.canonical && (
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                          canonical
                        </span>
                      )}
                      {src.serverProcessing && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                          server-processed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 uppercase text-zinc-500">
                      {src.type}
                    </td>
                    <td className="px-4 py-3">
                      {src.estimatedTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(src.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={src.active}
                        disabled={src.canonical}
                        onChange={(e) => toggleSource(src.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {!src.canonical && (
                        <button
                          type="button"
                          onClick={() => deleteSource(src.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
