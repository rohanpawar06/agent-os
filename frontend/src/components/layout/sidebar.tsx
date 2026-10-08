"use client";

import {
  Bot,
  Brain,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import type { WorkspaceView } from "@/types/workspace";

const navigation: Array<{ label: string; icon: typeof LayoutDashboard; view: WorkspaceView }> = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    view: "overview",
  },
  {
    label: "Agent",
    icon: Bot,
    view: "agent",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    view: "projects",
  },
  {
    label: "Tasks",
    icon: Terminal,
    view: "tasks",
  },
];

const intelligence: Array<{ label: string; icon: typeof Brain; view: WorkspaceView }> = [
  {
    label: "Memory",
    icon: Brain,
    view: "memory",
  },
  {
    label: "Capabilities",
    icon: Sparkles,
    view: "capabilities",
  },
  {
    label: "Tools",
    icon: Wrench,
    view: "tools",
  },
];

export function Sidebar({ activeView, onNavigate }: {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}) {
  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#202733] bg-[#0a0d12]">
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 border-b border-[#202733] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6cff]">
          <Bot size={21} strokeWidth={2.2} />
        </div>

        <div>
          <div className="text-[15px] font-semibold tracking-tight">
            AgentOS
          </div>

          <div className="text-[11px] text-[#626d7d]">
            Intelligent Workspace
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#626d7d]">
          Workspace
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.view)}
                aria-current={activeView === item.view ? "page" : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  activeView === item.view
                    ? "bg-[#141928] text-white"
                    : "text-[#8b95a5] hover:bg-[#11161f] hover:text-white"
                }`}
              >
                <Icon
                  size={17}
                  className={
                    activeView === item.view
                      ? "text-[#9185ff]"
                      : "text-[#687384] group-hover:text-[#aab3c1]"
                  }
                />

                <span>{item.label}</span>

                {activeView === item.view && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#7c6cff]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="my-6 h-px bg-[#202733]" />

        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#626d7d]">
          Intelligence
        </div>

        <nav className="space-y-1">
          {intelligence.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.view)}
                aria-current={activeView === item.view ? "page" : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[#11161f] hover:text-white ${activeView === item.view ? "bg-[#141928] text-white" : "text-[#8b95a5]"}`}
              >
                <Icon
                  size={17}
                  className="text-[#687384] group-hover:text-[#aab3c1]"
                />

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="border-t border-[#202733] p-3">
        <button type="button" onClick={() => onNavigate("security")} aria-current={activeView === "security" ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-[#11161f] hover:text-white ${activeView === "security" ? "bg-[#141928] text-white" : "text-[#8b95a5]"}`}>
          <ShieldCheck size={17} />
          Security
        </button>

        <button type="button" onClick={() => onNavigate("settings")} aria-current={activeView === "settings" ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-[#11161f] hover:text-white ${activeView === "settings" ? "bg-[#141928] text-white" : "text-[#8b95a5]"}`}>
          <Settings size={17} />
          Settings
        </button>
      </div>
    </aside>
  );
}
