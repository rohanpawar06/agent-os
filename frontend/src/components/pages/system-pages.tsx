"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Database, Loader2, RefreshCw, ShieldCheck, Sparkles, Trash2, Wrench } from "lucide-react";
import { useAgentStore } from "@/stores";
import type { Capability, WorkspaceView } from "@/types";
import { PageShell, InfoCard } from "./page-shell";
import { apiUrl } from "@/lib/api";

interface RuntimeStatus {
  success: boolean;
  model: string;
  ollama: { connected: boolean; availableModels: string[]; modelAvailable: boolean; error?: string; baseUrl: string };
  filesystem: { connected: boolean; roots: string[]; tools: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>; error?: string };
  memory: { connected: boolean; storage: string };
  checkedAt: string;
}

interface MemoryRecord {
  id: string;
  goal: string;
  outcome: "completed" | "failed";
  summary: string;
  createdAt: string;
}

export function MemoryPage() {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/memory"), { cache: "no-store" });
      const result = await response.json() as { success: boolean; memories?: MemoryRecord[]; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not load AgentOS memory.");
      setRecords(result.memories ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const visibleRecords = records.filter((record) => `${record.goal} ${record.summary}`.toLowerCase().includes(query.toLowerCase()));

  async function clearMemory(): Promise<void> {
    if (!window.confirm("Clear all locally stored AgentOS memories?")) return;
    setError("");
    const response = await fetch(apiUrl("/api/memory"), { method: "DELETE" });
    const result = await response.json() as { success: boolean; error?: string };
    if (!response.ok || !result.success) setError(result.error ?? "Could not clear memory.");
    else setRecords([]);
  }

  async function deleteMemory(id: string): Promise<void> {
    setError("");
    try {
      const response = await fetch(apiUrl(`/api/memory/${encodeURIComponent(id)}`), { method: "DELETE" });
      const result = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not delete this memory.");
      setRecords((current) => current.filter((record) => record.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  return <PageShell title="Memory" description="AgentOS stores short task outcomes locally so the planner can reuse relevant context.">
    <div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter memories" className="h-10 min-w-[220px] flex-1 rounded-lg border border-[#29313d] bg-[#0e131a] px-3 text-xs outline-none focus:border-[#6257b7]" /><button type="button" onClick={() => void load()} className="flex h-10 items-center gap-2 rounded-lg border border-[#29313d] px-3 text-xs text-[#aab3c1] hover:bg-[#171d27]"><RefreshCw size={13} />Refresh</button><button type="button" onClick={() => void clearMemory()} disabled={!records.length} className="h-10 rounded-lg border border-[#633235] px-3 text-xs text-[#f0999e] hover:bg-[#281719] disabled:opacity-40">Clear memory</button></div>
    {error && <p role="alert" className="rounded-lg border border-[#633235] bg-[#281719] p-3 text-xs text-[#f0999e]">{error}</p>}
    <div className="space-y-3">{loading ? <StatusMessage text="Loading local memories…" /> : visibleRecords.length ? visibleRecords.map((record) => <article key={record.id} className="rounded-xl border border-[#202733] bg-[#0e131a] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-[#dce2ea]">{record.goal}</p><div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] ${record.outcome === "completed" ? "border-[#275d4c] text-[#78daba]" : "border-[#633235] text-[#f0999e]"}`}>{record.outcome}</span><button type="button" onClick={() => void deleteMemory(record.id)} aria-label={`Delete memory for ${record.goal}`} title="Delete memory" className="flex h-7 w-7 items-center justify-center rounded-md text-[#697384] hover:bg-[#321b20] hover:text-[#f0999e]"><Trash2 size={13} /></button></div></div><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#8b95a5]">{record.summary}</p><p className="mt-3 text-[10px] text-[#596474]">{new Date(record.createdAt).toLocaleString()}</p></article>) : <StatusMessage text={query ? "No memories match that filter." : "No task memories yet. Successful and failed tasks are saved here."} />}</div>
    <p className="text-[10px] text-[#596474]">Memory is stored in your local AgentOS data folder and is not sent to a remote service.</p>
  </PageShell>;
}

export function CapabilitiesPage({ showSchemas = false }: { showSchemas?: boolean }) {
  const capabilities = useAgentStore((state) => state.capabilities);
  const runtime = useAgentStore((state) => state.runtime);
  const tools = capabilities.flatMap((capability) => capability.tools);
  return <PageShell title={showSchemas ? "Tools" : "Capabilities"} description={showSchemas ? "Tool contracts discovered from the connected Model Context Protocol server." : "Live capabilities AgentOS can use for workspace and Desktop tasks."}>
    <div className="grid gap-3 sm:grid-cols-2"><InfoCard label="MCP server" value={runtime.mcp === "connected" ? "Connected" : runtime.mcp === "connecting" ? "Connecting" : "Unavailable"} detail="Filesystem MCP" /><InfoCard label="Tools" value={`${tools.length}`} detail="Discovered from the running server" /></div>
    {tools.length ? <div className="grid gap-3 lg:grid-cols-2">{tools.map((tool) => <article key={tool.name} className="rounded-xl border border-[#202733] bg-[#0e131a] p-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17152a] text-[#a79fff]"><Wrench size={14} /></span><h2 className="font-mono text-xs font-semibold text-[#e2e7ef]">{tool.name}</h2></div><p className="mt-3 text-xs leading-5 text-[#8b95a5]">{tool.description}</p>{showSchemas && <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#090d12] p-3 text-[10px] leading-4 text-[#758196]">{JSON.stringify(tool.inputSchema ?? {}, null, 2)}</pre>}</article>)}</div> : <StatusMessage text="No tools are available yet. Check Settings and confirm the MCP filesystem server is connected." />}
  </PageShell>;
}

export function SecurityPage() {
  return <PageShell title="Security" description="Local execution boundaries used by the current AgentOS build.">
    <div className="grid gap-3 md:grid-cols-2"><InfoCard label="Filesystem roots" value="Workspace + Desktop" detail="Every filesystem tool is limited to these roots." /><InfoCard label="Model runtime" value="Local Ollama" detail="Prompts and file operations are sent to the local Ollama service." /></div>
    <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#78daba]" /><h2 className="text-sm font-semibold">Allowed file operations</h2></div><ul className="mt-4 grid gap-2 text-xs text-[#aab3c1] sm:grid-cols-2"><li>• List, search, read, and write files</li><li>• Create folders</li><li>• Copy, move, and rename paths</li><li>• Delete files or folders when requested</li></ul><p className="mt-4 border-t border-[#202733] pt-4 text-xs leading-5 text-[#697384]">Path traversal and symbolic links that escape the allowed roots are rejected. This build does not execute arbitrary shell commands, access the rest of the computer, or provide internet search.</p></section>
  </PageShell>;
}

export function SettingsPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const setCapabilities = useAgentStore((state) => state.setCapabilities);
  const setRuntime = useAgentStore((state) => state.setRuntime);
  const setAgentStatus = useAgentStore((state) => state.setAgentStatus);
  const currentAgent = useAgentStore((state) => state.agent);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/status"), { cache: "no-store" });
      const result = await response.json() as RuntimeStatus & { error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not check AgentOS services.");
      setStatus(result);
      setSelectedModel(result.model);
      setCapabilities(result.filesystem.tools.length ? [{
        id: "filesystem-mcp",
        name: "Filesystem MCP",
        description: "Workspace and Desktop file operations.",
        status: result.filesystem.connected ? "connected" : "error",
        type: "mcp",
        tools: result.filesystem.tools,
      }] : []);
      setRuntime({
        reasoning: result.ollama.connected && result.ollama.modelAvailable ? "ready" : "error",
        memory: result.memory.connected ? "connected" : "error",
        mcp: result.filesystem.connected ? "connected" : "error",
      });
      setAgentStatus(result.ollama.connected && result.ollama.modelAvailable ? "idle" : "offline");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
      setRuntime({ reasoning: "error", mcp: "error" });
      setAgentStatus("offline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  async function saveModel(): Promise<void> {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(apiUrl("/api/settings"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: selectedModel }),
      });
      const result = await response.json() as { success: boolean; model?: string; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not update the model.");
      setSelectedModel(result.model ?? selectedModel);
      setMessage(`Model set to ${result.model ?? selectedModel}.`);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  const modelAvailable = status?.ollama.availableModels.some((model) => model.toLowerCase().replace(/:latest$/, "") === selectedModel.toLowerCase().replace(/:latest$/, "")) ?? false;

  return <PageShell title="Settings" description="Choose an installed local model and inspect the real connection state for Ollama and MCP.">
    <div className="grid gap-3 sm:grid-cols-3"><InfoCard label="Ollama" value={loading ? "Checking…" : status?.ollama.connected ? "Connected" : "Offline"} detail={status?.ollama.error ?? status?.ollama.baseUrl ?? "Local model service"} /><InfoCard label="Filesystem MCP" value={loading ? "Checking…" : status?.filesystem.connected ? "Connected" : "Unavailable"} detail={status?.filesystem.error ?? `${status?.filesystem.tools.length ?? 0} tools discovered`} /><InfoCard label="Memory" value="Local" detail="Persistent memory file in AgentOS data folder" /></div>
    <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="flex flex-wrap items-end gap-3"><label className="min-w-[220px] flex-1 text-xs text-[#8b95a5]">Ollama model<select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={!status?.ollama.availableModels.length} className="mt-2 h-10 w-full rounded-lg border border-[#29313d] bg-[#090d12] px-3 text-xs text-white outline-none focus:border-[#6257b7] disabled:opacity-50">{status?.ollama.availableModels.length ? status.ollama.availableModels.map((model) => <option key={model} value={model}>{model}</option>) : <option value={selectedModel || currentAgent.model || "qwen2.5"}>{selectedModel || currentAgent.model || "qwen2.5"}</option>}</select></label><button type="button" disabled={saving || loading || !modelAvailable || selectedModel === status?.model} onClick={() => void saveModel()} className="flex h-10 items-center gap-2 rounded-lg bg-[#7c6cff] px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Save model</button><button type="button" onClick={() => void refresh()} className="flex h-10 items-center gap-2 rounded-lg border border-[#29313d] px-3 text-xs text-[#aab3c1] hover:bg-[#171d27]"><RefreshCw size={13} />Check again</button></div>
      {!status?.ollama.connected && <p className="mt-3 text-xs text-[#e5b85c]">Start Ollama, then run `ollama pull qwen2.5` (or install another model) and check again.</p>}
      {status?.ollama.connected && !status.ollama.modelAvailable && <p className="mt-3 text-xs text-[#e5b85c]">The configured model is not installed. Choose one from the installed model list.</p>}
      {message && <p role="status" className="mt-3 text-xs text-[#78daba]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-[#f0999e]">{error}</p>}
      <p className="mt-4 border-t border-[#202733] pt-4 text-[10px] text-[#596474]">Model selection is saved in your local AgentOS settings file. The Ollama server address is configured with `OLLAMA_BASE_URL` before startup.</p>
    </section>
    {status?.filesystem.roots && <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="mb-3 flex items-center gap-2"><Database size={15} className="text-[#a79fff]" /><h2 className="text-sm font-semibold">Filesystem roots</h2></div><div className="flex flex-wrap gap-2">{status.filesystem.roots.map((root) => <span key={root} className="rounded-lg border border-[#29313d] bg-[#090d12] px-3 py-2 font-mono text-xs text-[#aab3c1]">{root}</span>)}</div></section>}
  </PageShell>;
}

function StatusMessage({ text }: { text: string }) {
  return <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-[#29313d] px-6 text-center text-xs text-[#697384]"><Sparkles size={14} className="mr-2" />{text}</div>;
}
