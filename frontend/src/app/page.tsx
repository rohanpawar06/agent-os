"use client";

import { ActivityFeed } from "@/components/activity/activity-feed";
import { AgentHeader } from "@/components/agent/agent-header";
import { ChatWindow } from "@/components/chat/chat-window";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAgentStore } from "@/stores";

import {
  Brain,
  Cpu,
  Database,
  PlugZap,
  Radio,
  Wrench,
} from "lucide-react";

export default function Home() {
  return (
    <main className="flex h-screen min-h-0 overflow-hidden bg-[#090d12] text-white">

      {/* ================================================= */}
      {/* LEFT SIDEBAR                                     */}
      {/* ================================================= */}

      <Sidebar />

      {/* ================================================= */}
      {/* MAIN APPLICATION                                  */}
      {/* ================================================= */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* TOP BAR */}

        <Topbar />

        {/* WORKSPACE */}

        <div className="flex min-h-0 flex-1">

          {/* ============================================= */}
          {/* AGENT AREA                                    */}
          {/* ============================================= */}

          <section className="flex min-w-0 flex-1 flex-col">

            <AgentHeader />

            <ChatWindow />

          </section>

          {/* ============================================= */}
          {/* RIGHT INTELLIGENCE PANEL                     */}
          {/* ============================================= */}

          <aside className="flex w-[310px] shrink-0 flex-col border-l border-[#202733] bg-[#0b1016]">

            {/* Activity */}

            <div className="min-h-0 flex-1">
              <ActivityFeed />
            </div>

            {/* Runtime */}

            <RuntimePanel />

          </aside>

        </div>

      </div>

    </main>
  );
}

/* ========================================================= */
/* RUNTIME PANEL                                             */
/* ========================================================= */

function RuntimePanel() {

  const runtime = useAgentStore(
    (state) => state.runtime
  );

  const agent = useAgentStore(
    (state) => state.agent
  );

  const capabilities = useAgentStore(
    (state) => state.capabilities
  );

  const activeTools =
    capabilities.reduce(
      (total, capability) =>
        total + capability.tools.length,
      0
    );

  return (
    <div className="shrink-0 border-t border-[#202733] bg-[#0b1016]">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <div className="flex items-center justify-between border-b border-[#202733] px-4 py-3">

        <div className="flex items-center gap-2">

          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#17152a]">

            <Cpu
              size={13}
              className="text-[#9185ff]"
            />

          </div>

          <div>

            <p className="text-xs font-semibold text-white">
              Agent Runtime
            </p>

            <p className="text-[9px] text-[#4f5968]">
              Live system state
            </p>

          </div>

        </div>

        <div className="flex items-center gap-1.5">

          <span
            className={`h-1.5 w-1.5 rounded-full ${
              agent.status === "error"
                ? "bg-[#ef7272]"
                : "animate-pulse bg-[#45c89a]"
            }`}
          />

          <span className="text-[9px] uppercase tracking-wide text-[#697384]">
            {formatStatus(agent.status)}
          </span>

        </div>

      </div>

      {/* ================================================= */}
      {/* RUNTIME STATUS GRID                               */}
      {/* ================================================= */}

      <div className="grid grid-cols-2 gap-2 p-3">

        <RuntimeItem
          icon={<Brain size={12} />}
          label="Reasoning"
          value={formatReasoning(runtime.reasoning)}
          state={
            runtime.reasoning === "active"
              ? "active"
              : "normal"
          }
        />

        <RuntimeItem
          icon={<Database size={12} />}
          label="Memory"
          value={formatMemory(runtime.memory)}
          state={
            runtime.memory === "searching"
              ? "active"
              : runtime.memory === "error"
                ? "error"
                : "normal"
          }
        />

        <RuntimeItem
          icon={<PlugZap size={12} />}
          label="MCP"
          value={formatMcp(runtime.mcp)}
          state={
            runtime.mcp === "connecting"
              ? "active"
              : runtime.mcp === "error"
                ? "error"
                : "normal"
          }
        />

        <RuntimeItem
          icon={<Wrench size={12} />}
          label="Tools"
          value={`${activeTools} available`}
          state="normal"
        />

      </div>

      {/* ================================================= */}
      {/* EXECUTION                                        */}
      {/* ================================================= */}

      <div className="px-3 pb-3">

        <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-3">

          <div className="mb-2 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Radio
                size={12}
                className="text-[#9185ff]"
              />

              <span className="text-[10px] font-medium text-[#8b95a5]">
                Execution
              </span>

            </div>

            <span className="text-[9px] text-[#626d7d]">
              {formatStatus(agent.status)}
            </span>

          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-[#171d26]">

            <div
              className={`h-full rounded-full transition-all duration-500 ${
                agent.status === "executing"
                  ? "w-3/4 bg-[#9185ff]"
                  : agent.status === "thinking" ||
                      agent.status === "planning"
                    ? "w-1/2 bg-[#9185ff]"
                    : agent.status === "completed"
                      ? "w-full bg-[#45c89a]"
                      : "w-0"
              }`}
            />

          </div>

        </div>

      </div>

    </div>
  );
}

/* ========================================================= */
/* RUNTIME ITEM                                              */
/* ========================================================= */

function RuntimeItem({
  icon,
  label,
  value,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  state:
    | "normal"
    | "active"
    | "error";
}) {

  return (
    <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-3">

      <div className="flex items-center gap-2">

        <div
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${
            state === "active"
              ? "bg-[#17152a] text-[#9185ff]"
              : state === "error"
                ? "bg-[#241414] text-[#ef7272]"
                : "bg-[#10151d] text-[#697384]"
          }`}
        >
          {icon}
        </div>

        <span className="text-[9px] uppercase tracking-wide text-[#4f5968]">
          {label}
        </span>

      </div>

      <div className="mt-2 flex items-center gap-1.5">

        <span
          className={`h-1.5 w-1.5 rounded-full ${
            state === "active"
              ? "animate-pulse bg-[#9185ff]"
              : state === "error"
                ? "bg-[#ef7272]"
                : "bg-[#45c89a]"
          }`}
        />

        <span
          className={`text-[10px] font-medium ${
            state === "active"
              ? "text-[#b8b0ff]"
              : state === "error"
                ? "text-[#ef7272]"
                : "text-[#8b95a5]"
          }`}
        >
          {value}
        </span>

      </div>

    </div>
  );
}

/* ========================================================= */
/* FORMATTERS                                                */
/* ========================================================= */

function formatReasoning(
  value:
    | "ready"
    | "active"
    | "waiting"
) {
  switch (value) {

    case "active":
      return "Thinking";

    case "waiting":
      return "Waiting";

    default:
      return "Ready";
  }
}

function formatMemory(
  value:
    | "connected"
    | "searching"
    | "error"
) {
  switch (value) {

    case "searching":
      return "Searching";

    case "error":
      return "Error";

    default:
      return "Connected";
  }
}

function formatMcp(
  value:
    | "connected"
    | "connecting"
    | "error"
) {
  switch (value) {

    case "connecting":
      return "Connecting";

    case "error":
      return "Error";

    default:
      return "Connected";
  }
}

function formatStatus(status: string) {

  switch (status) {

    case "thinking":
      return "Thinking";

    case "planning":
      return "Planning";

    case "executing":
      return "Executing";

    case "waiting":
      return "Waiting";

    case "completed":
      return "Completed";

    case "error":
      return "Error";

    case "connecting":
      return "Connecting";

    case "offline":
      return "Offline";

    default:
      return "Ready";
  }
}