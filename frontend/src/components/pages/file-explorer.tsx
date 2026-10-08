"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Copy,
  File,
  FilePlus2,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageShell } from "./page-shell";
import { apiUrl } from "@/lib/api";

type FileEntry = { name: string; type: "directory" | "file"; path?: string };
type ListingData = { path: string; entries: FileEntry[] };
type FileAction = "create_directory" | "write_file" | "read_file" | "delete_file" | "delete_path" | "copy_path" | "move_path" | "search_files";
type DialogMode = "folder" | "file" | "edit" | "view" | "copy" | "move" | null;

interface ApiResponse {
  success: boolean;
  error?: string;
  text?: string;
  data?: unknown;
}

export function FileExplorer() {
  const [currentPath, setCurrentPath] = useState(".");
  const [listing, setListing] = useState<ListingData | null>(null);
  const [visibleEntries, setVisibleEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [destination, setDestination] = useState("");
  const [viewerPath, setViewerPath] = useState("");

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError("");
    setNotice("");
    setIsSearching(false);
    try {
      const response = await fetch(apiUrl(`/api/files?path=${encodeURIComponent(path)}`), { cache: "no-store" });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.success) throw new Error(result.error ?? "Could not read this folder.");
      const data = result.data as ListingData;
      if (!data || !Array.isArray(data.entries)) throw new Error("The filesystem server returned an invalid directory listing.");
      setListing(data);
      setVisibleEntries(data.entries);
      setCurrentPath(path);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setListing(null);
      setVisibleEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDirectory("."); }, [loadDirectory]);

  const breadcrumbs = useMemo(() => currentPath === "." ? ["Workspace"] : currentPath.split("/").filter(Boolean), [currentPath]);
  const crumbSegments = currentPath.startsWith("Desktop") ? breadcrumbs.slice(1) : breadcrumbs.filter((crumb) => crumb !== "Workspace");

  async function callAction(action: FileAction, fields: Record<string, unknown>): Promise<ApiResponse> {
    const response = await fetch(apiUrl("/api/files"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...fields }),
    });
    const result = await response.json() as ApiResponse;
    if (!response.ok || !result.success) throw new Error(result.error ?? "The filesystem operation failed.");
    return result;
  }

  function childPath(parent: string, child: string): string {
    return `${parent === "." ? "" : `${parent.replace(/\/$/, "")}/`}${child}`;
  }

  function parentPath(path: string): string {
    if (path === "." || path === "Desktop/") return ".";
    const normalized = path.replace(/\/$/, "");
    const parent = normalized.slice(0, normalized.lastIndexOf("/"));
    return parent || ".";
  }

  async function openEntry(entry: FileEntry): Promise<void> {
    const fullPath = entry.path ?? childPath(currentPath, entry.name);
    if (entry.type === "directory") {
      setQuery("");
      await loadDirectory(fullPath);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await callAction("read_file", { path: fullPath });
      setViewerPath(fullPath);
      setContent(result.text ?? "");
      setDialog("view");
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : String(readError));
    } finally {
      setSaving(false);
    }
  }

  async function submitSearch(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      await loadDirectory(currentPath);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await callAction("search_files", { path: currentPath, query: trimmed });
      const data = result.data as { entries?: FileEntry[] } | undefined;
      setVisibleEntries(data?.entries ?? []);
      setIsSearching(true);
      if (!data?.entries?.length) setNotice(`No names matched “${trimmed}”.`);
      else setNotice(`${data.entries.length} matching item${data.entries.length === 1 ? "" : "s"}.`);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : String(searchError));
    } finally {
      setLoading(false);
    }
  }

  async function submitDialog(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    setSaving(true);
    setError("");
    try {
      if (dialog === "folder") {
        if (!trimmedName) throw new Error("Enter a folder name.");
        const path = childPath(currentPath, trimmedName);
        await callAction("create_directory", { name: path });
        setNotice(`Folder created: ${path}`);
      } else if (dialog === "file") {
        if (!trimmedName) throw new Error("Enter a file name.");
        const path = childPath(currentPath, trimmedName);
        await callAction("write_file", { path, content });
        setNotice(`File created: ${path}`);
      } else if (dialog === "edit") {
        await callAction("write_file", { path: viewerPath, content });
        setNotice(`Saved ${viewerPath}`);
      } else if (dialog === "copy" || dialog === "move") {
        if (!destination.trim()) throw new Error("Enter the destination path.");
        const action = dialog === "copy" ? "copy_path" : "move_path";
        await callAction(action, { source: sourcePath, destination: destination.trim() });
        setNotice(`${dialog === "copy" ? "Copied" : "Moved"} ${sourcePath}`);
      }
      const refreshPath = dialog === "move" ? parentPath(sourcePath) : currentPath;
      setDialog(null);
      setName("");
      setContent("");
      setDestination("");
      await loadDirectory(refreshPath);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: FileEntry): Promise<void> {
    const path = entry.path ?? childPath(currentPath, entry.name);
    if (!window.confirm(`Delete ${path}${entry.type === "directory" ? " and everything inside it" : ""}?`)) return;
    setError("");
    try {
      await callAction(entry.type === "directory" ? "delete_path" : "delete_file", { path });
      setNotice(`Deleted ${path}`);
      await loadDirectory(currentPath);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  function openMoveDialog(entry: FileEntry, mode: "copy" | "move"): void {
    const path = entry.path ?? childPath(currentPath, entry.name);
    setSourcePath(path);
    setDestination(childPath(currentPath, entry.name));
    setDialog(mode);
  }

  return (
    <PageShell title="Projects & files" description="Browse and manage files inside the AgentOS workspace or your real Windows Desktop.">
      <div className="rounded-2xl border border-[#202733] bg-[#0e131a]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#202733] p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadDirectory(".")} className={`rounded-lg px-3 py-2 text-xs ${currentPath === "." ? "bg-[#211e38] text-white" : "text-[#8b95a5] hover:bg-[#171d27]"}`}>Workspace</button>
            <button type="button" onClick={() => { setQuery(""); void loadDirectory("Desktop/"); }} className={`rounded-lg px-3 py-2 text-xs ${currentPath.startsWith("Desktop") ? "bg-[#211e38] text-white" : "text-[#8b95a5] hover:bg-[#171d27]"}`}>Desktop</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setName(""); setContent(""); setDialog("folder"); }} className="flex h-9 items-center gap-2 rounded-lg border border-[#29313d] px-3 text-xs text-[#c8ced8] hover:bg-[#171d27]"><FolderPlus size={14} />New folder</button>
            <button type="button" onClick={() => { setName(""); setContent(""); setDialog("file"); }} className="flex h-9 items-center gap-2 rounded-lg border border-[#29313d] px-3 text-xs text-[#c8ced8] hover:bg-[#171d27]"><FilePlus2 size={14} />New file</button>
            <button type="button" onClick={() => void loadDirectory(currentPath)} aria-label="Refresh directory" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#29313d] text-[#8b95a5] hover:bg-[#171d27]"><RefreshCw size={14} /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#202733] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-[#8b95a5]">
            <button type="button" onClick={() => void loadDirectory(parentPath(currentPath))} disabled={currentPath === "."} title="Go up one folder" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#29313d] disabled:opacity-35"><ArrowUp size={14} /></button>
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <button type="button" onClick={() => void loadDirectory(currentPath.startsWith("Desktop") ? "Desktop/" : ".")} className="shrink-0 rounded px-1 py-1 hover:bg-[#171d27]">{currentPath.startsWith("Desktop") ? "Desktop" : "Workspace"}</button>
              {crumbSegments.map((crumb, index) => {
                const path = currentPath.startsWith("Desktop") ? `Desktop/${crumbSegments.slice(0, index + 1).join("/")}` : crumbSegments.slice(0, index + 1).join("/");
                return <span key={`${crumb}-${index}`} className="flex shrink-0 items-center gap-1"><span className="text-[#45505f]">/</span><button type="button" onClick={() => void loadDirectory(path)} className="rounded px-1 py-1 hover:bg-[#171d27]">{crumb}</button></span>;
              })}
            </div>
          </div>
          <form onSubmit={(event) => void submitSearch(event)} className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-[#29313d] bg-[#0a0f15] px-3">
            <Search size={14} className="shrink-0 text-[#697384]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names in this folder" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#596474]" />
            {isSearching && <button type="button" onClick={() => { setQuery(""); void loadDirectory(currentPath); }} aria-label="Clear search" className="text-[#697384] hover:text-white"><X size={14} /></button>}
          </form>
        </div>

        {listing?.path && currentPath.startsWith("Desktop") && <div className="break-all border-b border-[#202733] bg-[#0a0f15] px-4 py-2 text-[10px] text-[#697384]">Windows Desktop path: {listing.path}</div>}
        {error && <div role="alert" className="m-4 rounded-lg border border-[#633235] bg-[#281719] px-3 py-2 text-xs text-[#f0999e]">{error}</div>}
        {notice && !error && <div role="status" className="m-4 rounded-lg border border-[#275d4c] bg-[#10251f] px-3 py-2 text-xs text-[#78daba]">{notice}</div>}

        <div className="p-2">
          {loading ? <div className="flex h-48 items-center justify-center gap-2 text-xs text-[#697384]"><Loader2 size={15} className="animate-spin" />Loading directory…</div> : visibleEntries.length ? <div className="divide-y divide-[#1b222d]">
            {visibleEntries.map((entry) => {
              const itemPath = entry.path ?? childPath(currentPath, entry.name);
              return <div key={itemPath} className="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 hover:bg-[#111720]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${entry.type === "directory" ? "bg-[#211e38] text-[#a79fff]" : "bg-[#17202a] text-[#91a3bb]"}`}>{entry.type === "directory" ? <Folder size={15} /> : <File size={15} />}</span>
                <button type="button" onClick={() => void openEntry(entry)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-medium text-[#dce2ea]">{entry.name}{entry.type === "directory" ? "/" : ""}</span>
                  <span className="mt-1 block truncate text-[10px] text-[#596474]">{entry.type === "directory" ? "Folder" : "File"}{entry.path ? ` · ${entry.path}` : ""}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button type="button" onClick={() => openMoveDialog(entry, "copy")} title={`Copy ${entry.name}`} className="flex h-8 w-8 items-center justify-center rounded-md text-[#697384] hover:bg-[#1c2430] hover:text-white"><Copy size={13} /></button>
                  <button type="button" onClick={() => openMoveDialog(entry, "move")} title={`Rename or move ${entry.name}`} className="flex h-8 w-8 items-center justify-center rounded-md text-[#697384] hover:bg-[#1c2430] hover:text-white"><Pencil size={13} /></button>
                  <button type="button" onClick={() => void deleteEntry(entry)} title={`Delete ${entry.name}`} className="flex h-8 w-8 items-center justify-center rounded-md text-[#697384] hover:bg-[#321b20] hover:text-[#f0999e]"><Trash2 size={13} /></button>
                </div>
              </div>;
            })}
          </div> : <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><Folder size={20} className="text-[#596474]" /><p className="mt-3 text-sm text-[#c8ced8]">{isSearching ? "No matching files or folders" : "This folder is empty"}</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#697384]">{isSearching ? "Try a shorter name or clear your search." : "Create a folder or file here, or choose another location."}</p></div>}
        </div>
      </div>

      {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={() => !saving && setDialog(null)}>
        <section role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#29313d] bg-[#10151e] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold">{dialogTitle(dialog)}</h2><p className="mt-1 break-all text-[10px] text-[#697384]">{dialog === "view" || dialog === "edit" ? viewerPath : currentPath}</p></div><button type="button" onClick={() => !saving && setDialog(null)} aria-label="Close dialog" className="rounded-md p-1.5 text-[#697384] hover:bg-[#1b2330] hover:text-white"><X size={16} /></button></div>
          {dialog === "view" ? <><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#202733] bg-[#090d12] p-4 font-mono text-xs leading-5 text-[#c8ced8]">{content || "(empty file)"}</pre><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setDialog(null)} className="rounded-lg border border-[#29313d] px-3 py-2 text-xs text-[#aab3c1]">Close</button><button type="button" onClick={() => setDialog("edit")} className="rounded-lg bg-[#7c6cff] px-3 py-2 text-xs font-medium text-white">Edit file</button></div></> : <form onSubmit={(event) => void submitDialog(event)} className="space-y-4">
            {(dialog === "folder" || dialog === "file") && <label className="block text-xs text-[#8b95a5]">Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#29313d] bg-[#090d12] px-3 text-sm text-white outline-none focus:border-[#6257b7]" placeholder={dialog === "folder" ? "New folder" : "notes.txt"} /></label>}
            {(dialog === "file" || dialog === "edit") && <label className="block text-xs text-[#8b95a5]">Text content<textarea autoFocus={dialog === "edit"} value={content} onChange={(event) => setContent(event.target.value)} rows={10} className="mt-2 w-full resize-y rounded-lg border border-[#29313d] bg-[#090d12] p-3 font-mono text-xs leading-5 text-white outline-none focus:border-[#6257b7]" placeholder="Type the file content" /></label>}
            {(dialog === "copy" || dialog === "move") && <><p className="break-all rounded-lg bg-[#090d12] p-3 text-xs text-[#aab3c1]">From: {sourcePath}</p><label className="block text-xs text-[#8b95a5]">Destination path<input autoFocus value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#29313d] bg-[#090d12] px-3 text-sm text-white outline-none focus:border-[#6257b7]" placeholder="Desktop/renamed-item" /></label><p className="text-[10px] text-[#697384]">Use a path inside `workspace/` or `Desktop/`. The destination must not already exist.</p></>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setDialog(null)} disabled={saving} className="rounded-lg border border-[#29313d] px-3 py-2 text-xs text-[#aab3c1]">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#7c6cff] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{saving && <Loader2 size={13} className="animate-spin" />}{dialog === "edit" ? "Save changes" : dialog === "copy" ? "Copy" : dialog === "move" ? "Move / rename" : dialog === "folder" ? "Create folder" : "Create file"}</button></div>
          </form>}
        </section>
      </div>}
    </PageShell>
  );
}

function dialogTitle(mode: Exclude<DialogMode, null>): string {
  switch (mode) {
    case "folder": return "Create folder";
    case "file": return "Create text file";
    case "edit": return "Edit file";
    case "view": return "File contents";
    case "copy": return "Copy file or folder";
    case "move": return "Move or rename file or folder";
  }
}
