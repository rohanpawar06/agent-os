"use client";

import { useState } from "react";
import {
  Activity,
  Brain,
  MoreHorizontal,
  Pause,
  Play,
  Square,
  Zap,
} from "lucide-react";
import { useAgentStore } from "@/stores";
import { stopCurrentAgentRequest } from "@/lib/agent/agent-client";

export function AgentHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const agent = useAgentStore((state) => state.agent);
  const isPaused = useAgentStore((state) => state.isPaused);
  const setPaused = useAgentStore((state) => state.setPaused);
  const isChatLoading = useAgentStore((state) => state.isChatLoading);
  const clearMessages = useAgentStore((state) => state.clearMessages);
  const isWorking = ["thinking", "planning", "executing", "connecting"].includes(agent.status);
  const hasError = agent.status === "error" || agent.status === "offline";
  const badge = isWorking ? "WORKING" : hasError ? "ERROR" : "READY";

  return (
    <div className="flex items-center justify-between border-b border-[#202733] px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#302d55] bg-[#17152a]">
          <Brain size={21} className="text-[#9185ff]" />

          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0c1017] ${hasError ? "bg-[#ef7272]" : isWorking ? "animate-pulse bg-[#9185ff]" : "bg-[#38d39f]"}`} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold">AgentOS Core</h1>

            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${hasError ? "border border-[#4a2727] bg-[#241414] text-[#ef7272]" : isWorking ? "border border-[#302d55] bg-[#17152a] text-[#b8b0ff]" : "border border-[#214c3d] bg-[#0d211a] text-[#57d9ac]"}`}>
              {badge}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-[#626d7d]">
            <span className="flex items-center gap-1.5">
              <Zap size={12} />
              Autonomous
            </span>

            <span>•</span>

            <span className="flex items-center gap-1.5">
              <Activity size={12} />
              {agent.model ?? "Local model"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused(!isPaused)}
          aria-pressed={isPaused}
          title="Pause or resume new requests"
          className="flex h-8 items-center gap-2 rounded-lg border border-[#202733] px-3 text-xs text-[#8b95a5] transition hover:bg-[#141a22] hover:text-white"
        >
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
          {isPaused ? "Resume" : "Pause"}
        </button>

        <button
          type="button"
          onClick={stopCurrentAgentRequest}
          disabled={!isChatLoading}
          title="Stop the current request"
          className="flex h-8 items-center gap-2 rounded-lg border border-[#202733] px-3 text-xs text-[#8b95a5] transition hover:bg-[#141a22] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Square size={11} />
          Stop
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Agent options"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202733] text-[#7d8797] transition hover:bg-[#141a22] hover:text-white"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-[#29313d] bg-[#111720] p-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setMenuOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#dce2ea] hover:bg-[#1b2330]"
              >
                Clear conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
