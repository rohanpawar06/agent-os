"use client";

import {
  Activity,
  Brain,
  MoreHorizontal,
  Pause,
  Play,
  Zap,
} from "lucide-react";

export function AgentHeader() {
  return (
    <div className="flex items-center justify-between border-b border-[#202733] px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#302d55] bg-[#17152a]">
          <Brain size={21} className="text-[#9185ff]" />

          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0c1017] bg-[#38d39f]" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold">AgentOS Core</h1>

            <span className="rounded-full border border-[#214c3d] bg-[#0d211a] px-2 py-0.5 text-[10px] font-medium text-[#57d9ac]">
              ONLINE
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
              Ready
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-8 items-center gap-2 rounded-lg border border-[#202733] px-3 text-xs text-[#8b95a5] transition hover:bg-[#141a22] hover:text-white">
          <Pause size={13} />
          Pause
        </button>

        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202733] text-[#7d8797] transition hover:bg-[#141a22] hover:text-white">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}