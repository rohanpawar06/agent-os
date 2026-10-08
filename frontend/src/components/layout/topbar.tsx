"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Command,
  Search,
  X,
} from "lucide-react";

import { useAgentStore, useEventStore, useTaskStore } from "@/stores";
import { workspaceViewLabels, type WorkspaceView } from "@/types/workspace";

type OpenPanel = "search" | "help" | "notifications" | "profile" | null;

export function Topbar({ activeView, onNavigate }: {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [query, setQuery] = useState("");
  const [dismissedCount, setDismissedCount] = useState(0);
  const events = useEventStore((state) => state.events);
  const messages = useAgentStore((state) => state.messages);
  const capabilities = useAgentStore((state) => state.capabilities);
  const tools = useMemo(
    () => capabilities.flatMap((capability) => capability.tools),
    [capabilities],
  );
  const tasks = useTaskStore((state) => state.tasks);
  const agent = useAgentStore((state) => state.agent);
  const recentEvents = events.slice(0, 6);
  const unreadCount = Math.max(0, events.length - dismissedCount);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return [
      ...messages
        .filter((message) => message.content.toLowerCase().includes(normalized))
        .slice(-5)
        .reverse()
        .map((message) => ({ label: message.content, detail: "Conversation", view: "agent" as const })),
      ...tasks
        .filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(normalized))
        .slice(0, 4)
        .map((task) => ({ label: task.title, detail: "Task history", view: "tasks" as const })),
      ...tools
        .filter((tool) => `${tool.name} ${tool.description}`.toLowerCase().includes(normalized))
        .slice(0, 4)
        .map((tool) => ({ label: tool.name, detail: tool.description, view: "capabilities" as const })),
    ].slice(0, 10);
  }, [messages, query, tasks, tools]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpenPanel("search");
      }
      if (event.key === "Escape") setOpenPanel(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(view: WorkspaceView): void {
    onNavigate(view);
    setOpenPanel(null);
  }

  return (
    <>
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#202733] bg-[#0a0d12] px-6">
        <div>
          <div className="text-sm font-medium text-white">{workspaceViewLabels[activeView]}</div>
          <div className="text-xs text-[#626d7d]">AgentOS local workspace</div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => { setQuery(""); setOpenPanel("search"); }}
            aria-label="Search AgentOS"
            className="flex h-9 items-center gap-2 rounded-lg border border-[#202733] bg-[#0e131a] px-3 text-xs text-[#8b95a5] transition hover:border-[#303947] hover:text-white"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Search</span>
            <span className="ml-2 hidden items-center gap-1 rounded border border-[#29313d] px-1.5 py-0.5 text-[10px] sm:flex"><Command size={9} />K</span>
          </button>
          <button type="button" onClick={() => setOpenPanel(openPanel === "help" ? null : "help")} aria-label="Help" aria-expanded={openPanel === "help"} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7d8797] transition hover:bg-[#11161f] hover:text-white">
            <CircleHelp size={17} />
          </button>
          <button type="button" onClick={() => { setDismissedCount(events.length); setOpenPanel(openPanel === "notifications" ? null : "notifications"); }} aria-label={`Notifications${unreadCount ? `, ${unreadCount} new` : ""}`} aria-expanded={openPanel === "notifications"} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#7d8797] transition hover:bg-[#11161f] hover:text-white">
            <Bell size={17} />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#7c6cff]" />}
          </button>
          <div className="mx-1 h-6 w-px bg-[#202733]" />
          <button type="button" onClick={() => setOpenPanel(openPanel === "profile" ? null : "profile")} aria-label="Local profile" aria-expanded={openPanel === "profile"} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[#11161f]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#242b39] text-[11px] font-semibold">RP</span>
            <ChevronDown size={14} className="text-[#626d7d]" />
          </button>
        </div>
      </header>

      {openPanel === "search" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onMouseDown={() => setOpenPanel(null)}>
          <section role="dialog" aria-modal="true" aria-label="Search AgentOS" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#29313d] bg-[#0e131a] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#202733] px-4">
              <Search size={16} className="text-[#697384]" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages, tasks, and tools" className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#596474]" />
              <button type="button" onClick={() => setOpenPanel(null)} aria-label="Close search" className="rounded-md p-1 text-[#697384] hover:bg-[#1a202b] hover:text-white"><X size={16} /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {!query.trim() ? <p className="px-3 py-8 text-center text-xs text-[#697384]">Type to search your local conversation, task history, and available tools.</p> : searchResults.length ? searchResults.map((item, index) => (
                <button key={`${item.view}-${item.label}-${index}`} type="button" onClick={() => navigate(item.view)} className="w-full rounded-lg px-3 py-3 text-left hover:bg-[#171e29]">
                  <span className="block truncate text-xs text-[#e2e7ef]">{item.label}</span>
                  <span className="mt-1 block truncate text-[10px] text-[#697384]">{item.detail}</span>
                </button>
              )) : <p className="px-3 py-8 text-center text-xs text-[#697384]">No matching messages, tasks, or tools.</p>}
            </div>
          </section>
        </div>
      )}

      {openPanel === "help" && <Popover onClose={() => setOpenPanel(null)} title="Using AgentOS">
        <p>Ask a question for the local Ollama model, or ask AgentOS to manage files in the project workspace or Windows Desktop.</p>
        <div className="mt-3 rounded-lg bg-[#0a0f15] p-3 text-[11px] leading-5 text-[#aab3c1]">
          <p>“Create a folder named reports on Desktop.”</p>
          <p>“Write hello.txt with the text Hello Rohan Pawar.”</p>
          <p>“List Desktop/reports and read hello.txt.”</p>
          <p>“Search the workspace for package.json.”</p>
        </div>
        <p className="mt-3 text-[#697384]">For current events or internet research, AgentOS needs a configured online search capability; this local build does not claim web access.</p>
      </Popover>}

      {openPanel === "notifications" && <Popover onClose={() => setOpenPanel(null)} title="Recent activity">
        {recentEvents.length ? <div className="max-h-80 space-y-1 overflow-y-auto">{recentEvents.map((event) => <div key={event.id} className="flex gap-2 rounded-lg px-2 py-2 hover:bg-[#171e29]"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#45c89a]" /><div className="min-w-0"><p className="text-xs text-[#dce2ea]">{eventTitle(event.type)}</p><p className="mt-1 line-clamp-2 text-[10px] text-[#697384]">{event.data && typeof event.data === "object" && "message" in event.data ? String(event.data.message) : new Date(event.timestamp).toLocaleString()}</p></div></div>)}</div> : <p className="py-5 text-xs text-[#697384]">No activity yet. Completed agent and tool actions will appear here.</p>}
      </Popover>}

      {openPanel === "profile" && <Popover onClose={() => setOpenPanel(null)} title="Local session">
        <p className="font-medium text-[#dce2ea]">Rohan Pawar</p>
        <p className="mt-1">This app runs locally on this computer. Current agent status: {agent.status}.</p>
        <button type="button" onClick={() => navigate("settings")} className="mt-3 rounded-lg border border-[#29313d] px-3 py-2 text-xs text-white hover:bg-[#171e29]">Open settings</button>
      </Popover>}
    </>
  );
}

function Popover({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40" onMouseDown={onClose}>
      <section role="dialog" aria-label={title} onMouseDown={(event) => event.stopPropagation()} className="absolute right-4 top-[78px] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[#29313d] bg-[#10151e] p-4 text-[11px] leading-5 text-[#aab3c1] shadow-2xl">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-[#697384] hover:bg-[#1b2330] hover:text-white"><X size={14} /></button></div>
        {children}
      </section>
    </div>
  );
}

function eventTitle(type: string): string {
  return type.replaceAll(".", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
