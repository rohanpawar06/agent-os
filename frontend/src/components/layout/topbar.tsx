"use client";

import {
  Bell,
  ChevronDown,
  CircleHelp,
  Command,
  Search,
} from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#202733] bg-[#0a0d12] px-6">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-medium text-white">
            Agent Workspace
          </div>

          <div className="text-xs text-[#626d7d]">
            Autonomous intelligence environment
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="hidden h-9 items-center gap-2 rounded-lg border border-[#202733] bg-[#0e131a] px-3 text-xs text-[#626d7d] transition hover:border-[#303947] hover:text-[#9ca6b5] md:flex">
          <Search size={14} />
          Search

          <span className="ml-5 flex items-center gap-1 rounded border border-[#29313d] px-1.5 py-0.5 text-[10px]">
            <Command size={9} />
            K
          </span>
        </button>

        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7d8797] transition hover:bg-[#11161f] hover:text-white">
          <CircleHelp size={17} />
        </button>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#7d8797] transition hover:bg-[#11161f] hover:text-white">
          <Bell size={17} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#7c6cff]" />
        </button>

        <div className="mx-1 h-6 w-px bg-[#202733]" />

        {/* User */}
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[#11161f]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#242b39] text-[11px] font-semibold">
            RP
          </div>

          <ChevronDown size={14} className="text-[#626d7d]" />
        </button>
      </div>
    </header>
  );
}