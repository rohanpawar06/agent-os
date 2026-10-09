"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Database, Loader2, RefreshCw, ShieldCheck, Sparkles, Trash2, Wrench } from "lucide-react";
import { useAgentStore } from "@/stores";
import type { Capability, WorkspaceView } from "@/types";
import { PageShell, InfoCard } from "./page-shell";
import { apiFetch, getAgentOsApiKey, setAgentOsApiKey } from "@/lib/api";

interface RuntimeStatus {
  success: boolean;
  model: string;
  ollama: { connected: boolean; availableModels: string[]; modelAvailable: boolean; error?: string; baseUrl: string };
  filesystem: { connected: boolean; roots: string[]; tools: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>; error?: string };
  memory: { connected: boolean; storage: string };
  capabilities: Capability[];
  security: { mode: "local" | "tenant"; tenantId: string; workspaceIsolation: boolean; desktopAccess: boolean; rateLimitPerMinute: number };
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
      const response = await apiFetch("/api/memory", { cache: "no-store" });
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
    if (!window.confirm("Clear all AgentOS memories for this account?")) return;
    setError("");
    const response = await apiFetch("/api/memory", { method: "DELETE" });
    const result = await response.json() as { success: boolean; error?: string };
    if (!response.ok || !result.success) setError(result.error ?? "Could not clear memory.");
    else setRecords([]);
  }

  async function deleteMemory(id: string): Promise<void> {
    setError("");
    try {
      const response = await apiFetch(`/api/memory/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not delete this memory.");
      setRecords((current) => current.filter((record) => record.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  return <PageShell title="Memory" description="AgentOS stores short task outcomes in the current account's private data area so the planner can reuse relevant context.">
    <div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter memories" className="h-10 min-w-[220px] flex-1 rounded-lg border border-[#29313d] bg-[#0e131a] px-3 text-xs outline-none focus:border-[#6257b7]" /><button type="button" onClick={() => void load()} className="flex h-10 items-center gap-2 rounded-lg border border-[#29313d] px-3 text-xs text-[#aab3c1] hover:bg-[#171d27]"><RefreshCw size={13} />Refresh</button><button type="button" onClick={() => void clearMemory()} disabled={!records.length} className="h-10 rounded-lg border border-[#633235] px-3 text-xs text-[#f0999e] hover:bg-[#281719] disabled:opacity-40">Clear memory</button></div>
    {error && <p role="alert" className="rounded-lg border border-[#633235] bg-[#281719] p-3 text-xs text-[#f0999e]">{error}</p>}
    <div className="space-y-3">{loading ? <StatusMessage text="Loading local memories…" /> : visibleRecords.length ? visibleRecords.map((record) => <article key={record.id} className="rounded-xl border border-[#202733] bg-[#0e131a] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-[#dce2ea]">{record.goal}</p><div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] ${record.outcome === "completed" ? "border-[#275d4c] text-[#78daba]" : "border-[#633235] text-[#f0999e]"}`}>{record.outcome}</span><button type="button" onClick={() => void deleteMemory(record.id)} aria-label={`Delete memory for ${record.goal}`} title="Delete memory" className="flex h-7 w-7 items-center justify-center rounded-md text-[#697384] hover:bg-[#321b20] hover:text-[#f0999e]"><Trash2 size={13} /></button></div></div><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#8b95a5]">{record.summary}</p><p className="mt-3 text-[10px] text-[#596474]">{new Date(record.createdAt).toLocaleString()}</p></article>) : <StatusMessage text={query ? "No memories match that filter." : "No task memories yet. Successful and failed tasks are saved here."} />}</div>
    <p className="text-[10px] text-[#596474]">Memory is scoped to your account. Relevant records may be included in requests to the configured language model.</p>
  </PageShell>;
}

export function CapabilitiesPage({ showSchemas = false }: { showSchemas?: boolean }) {
  const capabilities = useAgentStore((state) => state.capabilities);
  const runtime = useAgentStore((state) => state.runtime);
  const tools = capabilities.flatMap((capability) => capability.tools);
  const enabledTools = tools.filter((tool) => tool.enabled !== false);
  return <PageShell title={showSchemas ? "Tools" : "Capabilities"} description={showSchemas ? "Tool contracts, permission state, and connector requirements for this account." : "Ten tool families with their current implementation, permissions, and connector status."}>
    <div className="grid gap-3 sm:grid-cols-3"><InfoCard label="Tool families" value={`${capabilities.length}/10`} detail="Filesystem, office files, and configured connector areas" /><InfoCard label="Enabled tools" value={`${enabledTools.length}`} detail="Operations allowed for this account" /><InfoCard label="Runtime" value={runtime.mcp === "connected" ? "Ready" : runtime.mcp === "connecting" ? "Connecting" : "Check settings"} detail="AgentOS backend" /></div>
    {capabilities.length ? <div className="space-y-3">{capabilities.map((capability) => <article key={capability.id} className="rounded-xl border border-[#202733] bg-[#0e131a] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17152a] text-[#a79fff]"><Wrench size={14} /></span><div><h2 className="text-sm font-semibold text-[#e2e7ef]">{capability.name}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-[#8b95a5]">{capability.description}</p></div></div><StatusBadge status={capability.status} /></div><p className="mt-3 text-xs leading-5 text-[#697384]">{capability.configuration}</p><div className="mt-3 flex flex-wrap gap-2">{capability.tools.map((tool) => <span key={tool.name} title={tool.description} className={`rounded-md border px-2 py-1 font-mono text-[10px] ${tool.enabled ? "border-[#275d4c] text-[#78daba]" : "border-[#29313d] text-[#697384]"}`}>{tool.name}</span>)}</div>{showSchemas && capability.tools.map((tool) => <div key={`${tool.name}-schema`} className="mt-3 grid gap-2 rounded-lg bg-[#090d12] p-3 sm:grid-cols-[minmax(150px,0.7fr)_minmax(220px,1.3fr)]"><p className="font-mono text-[10px] text-[#aab3c1]">{tool.name}<br /><span className="text-[#596474]">{tool.permission ?? (tool.enabled ? "enabled" : tool.status ?? "disabled")}</span></p><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-[#758196]">{JSON.stringify(tool.inputSchema ?? { description: tool.description }, null, 2)}</pre></div>)}</article>)}</div> : <StatusMessage text="Enter the API key provided by your AgentOS operator in Settings to load your account's capabilities." />}
  </PageShell>;
}

function StatusBadge({ status }: { status: Capability["status"] }) {
  const label = status === "available" || status === "connected" ? "Available" : status === "permission_required" ? "Permission required" : status === "requires_connector" ? "Connector required" : status;
  const style = status === "available" || status === "connected" ? "border-[#275d4c] text-[#78daba]" : status === "permission_required" ? "border-[#795e2a] text-[#e5b85c]" : "border-[#29313d] text-[#8b95a5]";
  return <span className={`rounded-full border px-2 py-1 text-[9px] ${style}`}>{label}</span>;
}

export function SecurityPage() {
  const [security, setSecurity] = useState<RuntimeStatus["security"] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void apiFetch("/api/status", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as RuntimeStatus & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not read security status.");
      setSecurity(result.security);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);
  return <PageShell title="Security" description="Account isolation, tool grants, and the boundaries enforced by this AgentOS deployment.">
    <div className="grid gap-3 md:grid-cols-3"><InfoCard label="Execution mode" value={security?.mode === "tenant" ? "Tenant" : security?.mode === "local" ? "Local" : "Checking"} detail={security?.mode === "tenant" ? "API-key authenticated account" : "Loopback-only local server"} /><InfoCard label="Workspace" value={security?.workspaceIsolation ? "Private per account" : "Local workspace"} detail="Filesystem paths are bounded to the assigned root." /><InfoCard label="Desktop access" value={security?.desktopAccess ? "Local only" : "Unavailable in cloud"} detail={security?.rateLimitPerMinute ? `${security.rateLimitPerMinute} API requests per minute per account` : "No remote tenant API"} /></div>
    <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#78daba]" /><h2 className="text-sm font-semibold">Enforced boundaries</h2></div><ul className="mt-4 grid gap-2 text-xs leading-5 text-[#aab3c1] sm:grid-cols-2"><li>• Tenant API keys are stored as SHA-256 hashes in server configuration.</li><li>• Tool execution is denied unless the account has an explicit grant.</li><li>• Cloud filesystem roots are isolated by account; traversal and symlink escapes are rejected.</li><li>• Browser and terminal operations require a local companion and are not exposed by the cloud server.</li><li>• Email, calendar, database, web, and generic API tools remain disabled until their connector adapters are implemented and configured.</li><li>• The local mode binds to loopback and fails startup if configured on a public interface.</li></ul>{error && <p role="alert" className="mt-4 text-xs text-[#f0999e]">{error}</p>}</section>
  </PageShell>;
}

export function SettingsPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const setCapabilities = useAgentStore((state) => state.setCapabilities);
  const setRuntime = useAgentStore((state) => state.setRuntime);
  const setAgentStatus = useAgentStore((state) => state.setAgentStatus);
  const currentAgent = useAgentStore((state) => state.agent);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/status", { cache: "no-store" });
      const result = await response.json() as RuntimeStatus & { error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not check AgentOS services.");
      setStatus(result);
      setSelectedModel(result.model);
      setCapabilities(result.capabilities.map((capability) => ({ ...capability, type: "builtin" as const })));
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

  useEffect(() => {
    setApiKey(getAgentOsApiKey());
    void refresh();
  }, []);

  function saveApiKey(): void {
    setAgentOsApiKey(apiKey);
    setKeyMessage(apiKey.trim() ? "API key saved for this browser tab." : "API key removed from this browser tab.");
    window.location.reload();
  }

  async function saveModel(): Promise<void> {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch("/api/settings", {
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

  return <PageShell title="Settings" description="Connect this browser to an AgentOS account and inspect the model and capability state.">
    <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="mb-3 flex items-center gap-2"><ShieldCheck size={15} className="text-[#a79fff]" /><h2 className="text-sm font-semibold">Account connection</h2></div><p className="mb-3 text-xs leading-5 text-[#8b95a5]">Remote deployments require an API key from the AgentOS operator. The key is held in this browser tab's session storage and is sent only to the configured AgentOS API.</p><div className="flex flex-wrap gap-2"><input aria-label="AgentOS API key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your AgentOS API key" className="h-10 min-w-[240px] flex-1 rounded-lg border border-[#29313d] bg-[#090d12] px-3 text-xs outline-none focus:border-[#6257b7]" /><button type="button" onClick={saveApiKey} className="h-10 rounded-lg bg-[#7c6cff] px-4 text-xs font-medium text-white">Connect</button><button type="button" onClick={() => { setApiKey(""); setAgentOsApiKey(""); window.location.reload(); }} className="h-10 rounded-lg border border-[#29313d] px-3 text-xs text-[#aab3c1] hover:bg-[#171d27]">Forget key</button></div>{keyMessage && <p role="status" className="mt-3 text-xs text-[#78daba]">{keyMessage}</p>}</section>
    <div className="grid gap-3 sm:grid-cols-3"><InfoCard label="Ollama" value={loading ? "Checking…" : status?.ollama.connected ? "Connected" : "Offline"} detail={status?.ollama.error ?? status?.ollama.baseUrl ?? "Configured model service"} /><InfoCard label="Filesystem" value={loading ? "Checking…" : status?.filesystem.connected ? "Ready" : "Unavailable"} detail={status?.filesystem.error ?? `${status?.filesystem.tools.length ?? 0} tools granted`} /><InfoCard label="Memory" value={status?.security.mode === "tenant" ? "Private account" : "Local"} detail="Persistent AgentOS data" /></div>
    <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="flex flex-wrap items-end gap-3"><label className="min-w-[220px] flex-1 text-xs text-[#8b95a5]">Ollama model<select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={!status?.ollama.availableModels.length} className="mt-2 h-10 w-full rounded-lg border border-[#29313d] bg-[#090d12] px-3 text-xs text-white outline-none focus:border-[#6257b7] disabled:opacity-50">{status?.ollama.availableModels.length ? status.ollama.availableModels.map((model) => <option key={model} value={model}>{model}</option>) : <option value={selectedModel || currentAgent.model || "qwen2.5"}>{selectedModel || currentAgent.model || "qwen2.5"}</option>}</select></label><button type="button" disabled={saving || loading || !modelAvailable || selectedModel === status?.model || status?.security.mode === "tenant"} onClick={() => void saveModel()} className="flex h-10 items-center gap-2 rounded-lg bg-[#7c6cff] px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Save model</button><button type="button" onClick={() => void refresh()} className="flex h-10 items-center gap-2 rounded-lg border border-[#29313d] px-3 text-xs text-[#aab3c1] hover:bg-[#171d27]"><RefreshCw size={13} />Check again</button></div>
      {!status?.ollama.connected && <p className="mt-3 text-xs text-[#e5b85c]">Start Ollama, then run `ollama pull qwen2.5` (or install another model) and check again.</p>}
      {status?.ollama.connected && !status.ollama.modelAvailable && <p className="mt-3 text-xs text-[#e5b85c]">The configured model is not installed. Choose one from the installed model list.</p>}
      {status?.security.mode === "tenant" && <p className="mt-3 text-xs text-[#697384]">The model is shared by this deployment and can only be changed by its operator.</p>}
      {message && <p role="status" className="mt-3 text-xs text-[#78daba]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-[#f0999e]">{error}</p>}
      <p className="mt-4 border-t border-[#202733] pt-4 text-[10px] text-[#596474]">In local mode, model selection is saved on this server. Tenant mode locks the shared model to the operator configuration. Configure the runtime with `OLLAMA_BASE_URL`.</p>
    </section>
    {status?.filesystem.roots && <section className="rounded-xl border border-[#202733] bg-[#0e131a] p-5"><div className="mb-3 flex items-center gap-2"><Database size={15} className="text-[#a79fff]" /><h2 className="text-sm font-semibold">Filesystem roots</h2></div><div className="flex flex-wrap gap-2">{status.filesystem.roots.map((root) => <span key={root} className="rounded-lg border border-[#29313d] bg-[#090d12] px-3 py-2 font-mono text-xs text-[#aab3c1]">{root}</span>)}</div></section>}
  </PageShell>;
}

function StatusMessage({ text }: { text: string }) {
  return <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-[#29313d] px-6 text-center text-xs text-[#697384]"><Sparkles size={14} className="mr-2" />{text}</div>;
}
