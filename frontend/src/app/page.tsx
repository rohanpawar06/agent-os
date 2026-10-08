"use client";

import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { AgentHeader } from "@/components/agent/agent-header";
import { ChatWindow } from "@/components/chat/chat-window";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CapabilitiesPage, MemoryPage, SecurityPage, SettingsPage } from "@/components/pages/system-pages";
import { FileExplorer } from "@/components/pages/file-explorer";
import { OverviewPage } from "@/components/pages/overview-page";
import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { apiUrl } from "@/lib/api";
import { useAgentStore, useEventStore, useTaskStore } from "@/stores";
import type { WorkspaceView } from "@/types/workspace";

interface StatusResponse {
  success: boolean;
  model: string;
  ollama: { connected: boolean; modelAvailable: boolean };
  filesystem: { connected: boolean; tools: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }> };
  memory: { connected: boolean };
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<WorkspaceView>("agent");

  useEffect(() => {
    void useAgentStore.persist.rehydrate();
    void useEventStore.persist.rehydrate();
    void useTaskStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(apiUrl("/api/status"), { cache: "no-store" })
      .then(async (response) => {
        const status = await response.json() as StatusResponse;
        if (!response.ok || !status.success) throw new Error("AgentOS backend is unavailable.");
        if (cancelled) return;
        const store = useAgentStore.getState();
        store.setCapabilities(status.filesystem.tools.length ? [{
          id: "filesystem-mcp",
          name: "Filesystem",
          description: "Workspace and Desktop file operations provided by the Spring Boot backend.",
          status: status.filesystem.connected ? "connected" : "error",
          type: "mcp",
          tools: status.filesystem.tools,
        }] : []);
        store.setRuntime({
          reasoning: status.ollama.connected && status.ollama.modelAvailable ? "ready" : "error",
          memory: status.memory.connected ? "connected" : "error",
          mcp: status.filesystem.connected ? "connected" : "error",
        });
        store.setAgentStatus(status.ollama.connected && status.ollama.modelAvailable ? "idle" : "offline");
        useAgentStore.setState((state) => ({ agent: { ...state.agent, model: status.model } }));
      })
      .catch(() => {
        if (!cancelled) {
          useAgentStore.getState().setRuntime({ reasoning: "error", mcp: "error" });
          useAgentStore.getState().setAgentStatus("offline");
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="flex h-screen min-h-0 overflow-hidden bg-[#090d12] text-white">
      <div className="hidden md:block"><Sidebar activeView={activeView} onNavigate={setActiveView} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar activeView={activeView} onNavigate={setActiveView} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeView === "overview" && <OverviewPage onNavigate={setActiveView} />}
          {activeView === "agent" && <AgentWorkspace />}
          {activeView === "projects" && <FileExplorer />}
          {activeView === "tasks" && <div className="h-full overflow-y-auto"><TaskWorkspace /></div>}
          {activeView === "memory" && <MemoryPage />}
          {activeView === "capabilities" && <CapabilitiesPage />}
          {activeView === "tools" && <CapabilitiesPage showSchemas />}
          {activeView === "security" && <SecurityPage />}
          {activeView === "settings" && <SettingsPage />}
        </div>
      </div>
    </main>
  );
}

function AgentWorkspace() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0c1017]">
      <AgentHeader />
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ChatWindow />
        <aside className="hidden min-h-0 border-l border-[#202733] xl:block"><ActivityFeed /></aside>
      </div>
    </div>
  );
}
