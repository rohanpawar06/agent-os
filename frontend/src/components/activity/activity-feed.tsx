"use client";

import {
  Brain,
  CheckCircle2,
  Clock3,
  FileCode2,
  FolderPlus,
  Loader2,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

import { useEventStore } from "@/stores";

import type {
  AgentEvent,
  AgentEventType,
} from "@/types";

export function ActivityFeed() {
  const events = useEventStore(
    (state) => state.events,
  );

  const recentEvents = events.slice(0, 12);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ================================================== */}
      {/* HEADER                                             */}
      {/* ================================================== */}

      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#202733] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#17152a]">
            <Clock3
              size={14}
              className="text-[#9185ff]"
            />
          </div>

          <span className="text-sm font-semibold text-white">
            Activity
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-[#202733] bg-[#10151d] px-2 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#45c89a]" />

          <span className="text-[9px] font-medium uppercase tracking-wide text-[#7f8998]">
            Live
          </span>
        </div>
      </div>

      {/* ================================================== */}
      {/* ACTIVITY LIST                                      */}
      {/* ================================================== */}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {recentEvents.length === 0 ? (
          <EmptyActivity />
        ) : (
          <div className="px-4 py-3">
            {recentEvents.map(
              (event, index) => (
                <ActivityItem
                  key={event.id}
                  event={event}
                  isLast={
                    index ===
                    recentEvents.length - 1
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================== */
/* ACTIVITY ITEM                                            */
/* ======================================================== */

function ActivityItem({
  event,
  isLast,
}: {
  event: AgentEvent;
  isLast: boolean;
}) {
  const config =
    getEventConfig(event.type);

  return (
    <div className="relative flex gap-3">
      {/* Timeline */}

      <div className="flex w-7 shrink-0 flex-col items-center">
        <div
          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg border ${config.iconContainer}`}
        >
          {config.icon}
        </div>

        {!isLast && (
          <div className="mt-1 h-full min-h-8 w-px bg-[#202733]" />
        )}
      </div>

      {/* Content */}

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#d8dde5]">
              {config.title}
            </p>

            <p className="mt-1 text-[10px] leading-4 text-[#697384]">
              {getEventDescription(event)}
            </p>
          </div>

          <span className="shrink-0 text-[9px] text-[#4f5968]">
            {formatTime(event.timestamp)}
          </span>
        </div>

        {/* Event status */}

        <div className="mt-2">
          <EventStatus
            type={event.type}
          />
        </div>

        {/* Tool information */}

        {isToolEvent(event.type) &&
          getToolName(event) && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#202733] bg-[#0e131a] px-2.5 py-2">
              <Wrench
                size={11}
                className="shrink-0 text-[#7e73e9]"
              />

              <span className="truncate font-mono text-[9px] text-[#8b95a5]">
                {getToolName(event)}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

/* ======================================================== */
/* STATUS                                                 */
/* ======================================================== */

function EventStatus({
  type,
}: {
  type: AgentEventType;
}) {
  const status =
    getEventStatus(type);

  if (status === "running") {
    return (
      <div className="flex items-center gap-1.5 text-[9px] text-[#a89fff]">
        <Loader2
          size={10}
          className="animate-spin"
        />

        <span>Running</span>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-1.5 text-[9px] text-[#45c89a]">
        <CheckCircle2 size={10} />

        <span>Completed</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-[9px] text-[#ef7272]">
        <XCircle size={10} />

        <span>Failed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[9px] text-[#7f8998]">
      <Zap size={10} />

      <span>Event</span>
    </div>
  );
}

/* ======================================================== */
/* EMPTY STATE                                              */
/* ======================================================== */

function EmptyActivity() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#202733] bg-[#10151d]">
        <Zap
          size={16}
          className="text-[#626d7d]"
        />
      </div>

      <p className="mt-3 text-xs font-medium text-[#8b95a5]">
        No activity yet
      </p>

      <p className="mt-1 max-w-[190px] text-[10px] leading-5 text-[#4f5968]">
        Agent activity, tool execution,
        MCP events, and system events
        will appear here.
      </p>
    </div>
  );
}

/* ======================================================== */
/* EVENT CONFIGURATION                                      */
/* ======================================================== */

function getEventConfig(
  type: AgentEventType,
) {
  switch (type) {
    case "agent.thinking":
      return {
        title: "Agent reasoning",
        icon: (
          <Brain
            size={13}
            className="text-[#9185ff]"
          />
        ),
        iconContainer:
          "border-[#302d55] bg-[#17152a]",
      };

    case "agent.status_changed":
      return {
        title: "Agent status",
        icon: (
          <Zap
            size={13}
            className="text-[#9185ff]"
          />
        ),
        iconContainer:
          "border-[#302d55] bg-[#17152a]",
      };

    case "agent.completed":
      return {
        title: "Agent completed",
        icon: (
          <CheckCircle2
            size={13}
            className="text-[#45c89a]"
          />
        ),
        iconContainer:
          "border-[#1d4438] bg-[#10221d]",
      };

    case "tool.started":
      return {
        title: "Tool execution",
        icon: (
          <Wrench
            size={13}
            className="text-[#a89fff]"
          />
        ),
        iconContainer:
          "border-[#302d55] bg-[#17152a]",
      };

    case "tool.completed":
      return {
        title: "Tool completed",
        icon: (
          <CheckCircle2
            size={13}
            className="text-[#45c89a]"
          />
        ),
        iconContainer:
          "border-[#1d4438] bg-[#10221d]",
      };

    case "tool.failed":
      return {
        title: "Tool failed",
        icon: (
          <XCircle
            size={13}
            className="text-[#ef7272]"
          />
        ),
        iconContainer:
          "border-[#4a2727] bg-[#241414]",
      };

    case "mcp.connected":
      return {
        title: "MCP connected",
        icon: (
          <Zap
            size={13}
            className="text-[#45c89a]"
          />
        ),
        iconContainer:
          "border-[#1d4438] bg-[#10221d]",
      };

    case "mcp.disconnected":
      return {
        title: "MCP disconnected",
        icon: (
          <XCircle
            size={13}
            className="text-[#ef7272]"
          />
        ),
        iconContainer:
          "border-[#4a2727] bg-[#241414]",
      };

    case "memory.retrieved":
      return {
        title: "Memory retrieved",
        icon: (
          <Brain
            size={13}
            className="text-[#7eb5ff]"
          />
        ),
        iconContainer:
          "border-[#243a56] bg-[#111d2b]",
      };

    case "memory.created":
      return {
        title: "Memory created",
        icon: (
          <Brain
            size={13}
            className="text-[#7eb5ff]"
          />
        ),
        iconContainer:
          "border-[#243a56] bg-[#111d2b]",
      };

    case "artifact.created":
      return {
        title: "Artifact created",
        icon: (
          <FileCode2
            size={13}
            className="text-[#7eb5ff]"
          />
        ),
        iconContainer:
          "border-[#243a56] bg-[#111d2b]",
      };

    case "approval.required":
      return {
        title: "Approval required",
        icon: (
          <Clock3
            size={13}
            className="text-[#e5b85c]"
          />
        ),
        iconContainer:
          "border-[#4b3d20] bg-[#241e10]",
      };

    case "approval.granted":
      return {
        title: "Approval granted",
        icon: (
          <CheckCircle2
            size={13}
            className="text-[#45c89a]"
          />
        ),
        iconContainer:
          "border-[#1d4438] bg-[#10221d]",
      };

    case "approval.denied":
      return {
        title: "Approval denied",
        icon: (
          <XCircle
            size={13}
            className="text-[#ef7272]"
          />
        ),
        iconContainer:
          "border-[#4a2727] bg-[#241414]",
      };

    default:
      return {
        title: "Agent activity",
        icon: (
          <FolderPlus
            size={13}
            className="text-[#8b95a5]"
          />
        ),
        iconContainer:
          "border-[#202733] bg-[#10151d]",
      };
  }
}

/* ======================================================== */
/* EVENT DESCRIPTION                                        */
/* ======================================================== */

function getEventDescription(
  event: AgentEvent,
) {
  const data =
    event.data as
      | Record<string, unknown>
      | undefined;

  switch (event.type) {
    case "agent.thinking":
      return (
        typeof data?.message ===
          "string"
          ? data.message
          : "Agent is analyzing the request."
      );

    case "agent.status_changed":
      return (
        typeof data?.message ===
          "string"
          ? data.message
          : "Agent status changed."
      );

    case "agent.completed":
      return "Agent finished the current operation.";

    case "tool.started":
      return "Tool execution started.";

    case "tool.completed":
      return "Tool execution completed.";

    case "tool.failed":
      return (
        typeof data?.error ===
          "string"
          ? data.error
          : "Tool execution failed."
      );

    case "mcp.connected":
      return "MCP server is connected.";

    case "mcp.disconnected":
      return "MCP server disconnected.";

    case "memory.retrieved":
      return "Relevant memory retrieved.";

    case "memory.created":
      return "New memory stored.";

    case "artifact.created":
      return "A new artifact was created.";

    case "approval.required":
      return (
        typeof data?.reason ===
          "string"
          ? data.reason
          : "Agent requires approval."
      );

    case "approval.granted":
      return "Requested action was approved.";

    case "approval.denied":
      return "Requested action was denied.";

    default:
      return "Agent event received.";
  }
}

/* ======================================================== */
/* TOOL HELPERS                                             */
/* ======================================================== */

function isToolEvent(
  type: AgentEventType,
) {
  return (
    type === "tool.started" ||
    type === "tool.completed" ||
    type === "tool.failed"
  );
}

function getToolName(
  event: AgentEvent,
) {
  const data =
    event.data as
      | Record<string, unknown>
      | undefined;

  return typeof data?.toolName ===
    "string"
    ? data.toolName
    : undefined;
}

/* ======================================================== */
/* EVENT STATUS                                             */
/* ======================================================== */

function getEventStatus(
  type: AgentEventType,
) {
  switch (type) {
    case "tool.started":
      return "running";

    case "tool.completed":
    case "agent.completed":
    case "mcp.connected":
    case "memory.retrieved":
    case "memory.created":
    case "artifact.created":
    case "approval.granted":
      return "success";

    case "tool.failed":
    case "agent.error":
    case "mcp.disconnected":
    case "approval.denied":
      return "error";

    default:
      return "neutral";
  }
}

/* ======================================================== */
/* TIME FORMAT                                              */
/* ======================================================== */

function formatTime(
  timestamp: string,
) {
  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}