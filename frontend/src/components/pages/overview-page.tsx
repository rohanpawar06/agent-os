"use client";

import { ArrowRight, CheckCircle2, Clock3, FolderOpen, Wrench } from "lucide-react";
import { useAgentStore, useEventStore, useTaskStore } from "@/stores";
import { PageShell, InfoCard } from "./page-shell";
import type { WorkspaceView } from "@/types/workspace";

export function OverviewPage({ onNavigate }: { onNavigate: (view: WorkspaceView) => void }) {
  const agent = useAgentStore((state) => state.agent);
  const runtime = useAgentStore((state) => state.runtime);
  const capabilities = useAgentStore((state) => state.capabilities);
  const tasks = useTaskStore((state) => state.tasks);
  const events = useEventStore((state) => state.events);
  const toolsCount = capabilities.reduce((count, capability) => count + capability.tools.length, 0);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;

  return (
    <PageShell title="Overview" description="Local AgentOS runtime, current activity, and quick access to your workspace.">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Model" value={agent.model ?? "Not configured"} detail={`Agent status: ${agent.status}`} />
        <InfoCard label="Filesystem tools" value={`${toolsCount}`} detail={runtime.mcp === "connected" ? "MCP server connected" : "MCP server unavailable"} />
        <InfoCard label="Completed tasks" value={`${completedTasks}`} detail={`${tasks.length} total in local history`} />
        <InfoCard label="Memory records" value={`${events.filter((event) => event.type === "memory.created").length}`} detail="Stored locally by AgentOS" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Continue working</h2><p className="mt-1 text-xs text-[#697384]">Open the live chat or browse files AgentOS can access.</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <QuickLink icon={<ArrowRight size={15} />} title="Ask AgentOS" detail="Questions and multi-step file tasks" onClick={() => onNavigate("agent")} />
            <QuickLink icon={<FolderOpen size={15} />} title="Browse files" detail="Workspace and Windows Desktop" onClick={() => onNavigate("projects")} />
            <QuickLink icon={<Clock3 size={15} />} title="Task history" detail="Plans, tool calls, and outcomes" onClick={() => onNavigate("tasks")} />
            <QuickLink icon={<Wrench size={15} />} title="Available tools" detail="Discovered filesystem capabilities" onClick={() => onNavigate("tools")} />
          </div>
        </div>
        <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-5">
          <h2 className="text-sm font-semibold">Recent tasks</h2>
          <div className="mt-3 space-y-2">
            {tasks.slice(0, 5).map((task) => <div key={task.id} className="flex items-start gap-2 rounded-lg bg-[#0a0f15] p-3"><CheckCircle2 size={14} className={task.status === "completed" ? "mt-0.5 text-[#45c89a]" : "mt-0.5 text-[#ef7272]"} /><div className="min-w-0"><p className="truncate text-xs text-[#dce2ea]">{task.title}</p><p className="mt-1 text-[10px] text-[#697384]">{task.status} · {new Date(task.createdAt).toLocaleString()}</p></div></div>)}
            {tasks.length === 0 && <p className="rounded-lg border border-dashed border-[#29313d] px-3 py-8 text-center text-xs text-[#697384]">Tasks you run will appear here.</p>}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function QuickLink({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl border border-[#202733] bg-[#0a0f15] p-4 text-left transition hover:border-[#403970] hover:bg-[#121722]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17152a] text-[#a79fff]">{icon}</span><span className="min-w-0"><span className="block text-xs font-medium text-[#dce2ea]">{title}</span><span className="mt-1 block text-[10px] text-[#697384]">{detail}</span></span></button>;
}
