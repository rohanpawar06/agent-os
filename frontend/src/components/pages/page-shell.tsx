import type { ReactNode } from "react";

export function PageShell({ title, description, action, children }: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#090d12] text-white">
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d8797]">{description}</p>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

export function InfoCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#596474]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#e7ebf2]">{value}</p>
      {detail && <p className="mt-1 text-xs text-[#697384]">{detail}</p>}
    </div>
  );
}
