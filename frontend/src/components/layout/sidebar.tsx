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

const navigation = [
  {
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    label: "Agent",
    icon: Bot,
    active: true,
  },
  {
    label: "Projects",
    icon: FolderKanban,
  },
  {
    label: "Tasks",
    icon: Terminal,
  },
];

const intelligence = [
  {
    label: "Memory",
    icon: Brain,
  },
  {
    label: "Capabilities",
    icon: Sparkles,
  },
  {
    label: "Tools",
    icon: Wrench,
  },
];

export function Sidebar() {
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
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  item.active
                    ? "bg-[#141928] text-white"
                    : "text-[#8b95a5] hover:bg-[#11161f] hover:text-white"
                }`}
              >
                <Icon
                  size={17}
                  className={
                    item.active
                      ? "text-[#9185ff]"
                      : "text-[#687384] group-hover:text-[#aab3c1]"
                  }
                />

                <span>{item.label}</span>

                {item.active && (
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
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#8b95a5] transition hover:bg-[#11161f] hover:text-white"
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
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#8b95a5] transition hover:bg-[#11161f] hover:text-white">
          <ShieldCheck size={17} />
          Security
        </button>

        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#8b95a5] transition hover:bg-[#11161f] hover:text-white">
          <Settings size={17} />
          Settings
        </button>
      </div>
    </aside>
  );
}