"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  FileCode2,
  Folder,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

import { useTaskStore } from "@/stores";

import type {
  AgentTask,
  TaskStep,
  TaskStepStatus,
} from "@/types/task";

export function TaskWorkspace() {
  const tasks = useTaskStore(
    (state) => state.tasks,
  );

  const activeTaskId =
    useTaskStore(
      (state) =>
        state.activeTaskId,
    );

  const setActiveTask =
    useTaskStore(
      (state) =>
        state.setActiveTask,
    );

  const activeTask =
    tasks.find(
      (task) =>
        task.id ===
        activeTaskId,
    ) ?? tasks[0];

  if (!activeTask) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#697384]">
        No tasks available.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[#090d12] text-white">

      {/* ================================================= */}
      {/* TASK LIST                                        */}
      {/* ================================================= */}

      <aside className="w-[280px] shrink-0 border-r border-[#202733] bg-[#0b1016]">

        <div className="border-b border-[#202733] px-4 py-4">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-semibold">
                Tasks
              </p>

              <p className="mt-1 text-[10px] text-[#566171]">
                Autonomous execution
              </p>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#17152a]">
              <Zap
                size={13}
                className="text-[#9185ff]"
              />
            </div>

          </div>

        </div>

        <div className="space-y-1 p-2">

          {tasks.map(
            (task) => (
              <TaskListItem
                key={task.id}
                task={task}
                active={
                  task.id ===
                  activeTask.id
                }
                onClick={() =>
                  setActiveTask(
                    task.id,
                  )
                }
              />
            ),
          )}

        </div>

      </aside>

      {/* ================================================= */}
      {/* TASK DETAILS                                     */}
      {/* ================================================= */}

      <section className="flex min-w-0 flex-1 flex-col">

        <TaskHeader task={activeTask} />

        <div className="min-h-0 flex-1 overflow-y-auto">

          <div className="mx-auto max-w-[1000px] space-y-5 p-6">

            <TaskOverview
              task={activeTask}
            />

            <ExecutionPlan
              task={activeTask}
            />

            <TaskArtifacts
              task={activeTask}
            />

          </div>

        </div>

      </section>

    </div>
  );
}

/* ========================================================= */
/* TASK LIST ITEM                                            */
/* ========================================================= */

function TaskListItem({
  task,
  active,
  onClick,
}: {
  task: AgentTask;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition ${
        active
          ? "border-[#302a58] bg-[#17152a]"
          : "border-transparent hover:border-[#202733] hover:bg-[#10151d]"
      }`}
    >

      <div className="flex items-start gap-3">

        <TaskStatusIcon
          status={task.status}
        />

        <div className="min-w-0 flex-1">

          <p className="truncate text-xs font-medium text-[#dce2ea]">
            {task.title}
          </p>

          <p className="mt-1 text-[10px] text-[#596474]">
            {formatTaskStatus(
              task.status,
            )}
          </p>

        </div>

        {active && (
          <ChevronRight
            size={13}
            className="mt-1 text-[#9185ff]"
          />
        )}

      </div>

    </button>
  );
}

/* ========================================================= */
/* TASK HEADER                                               */
/* ========================================================= */

function TaskHeader({
  task,
}: {
  task: AgentTask;
}) {
  return (
    <header className="shrink-0 border-b border-[#202733] bg-[#0b1016]">

      <div className="flex items-center justify-between px-6 py-4">

        <div className="min-w-0">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17152a]">
              <Sparkles
                size={16}
                className="text-[#9185ff]"
              />
            </div>

            <div className="min-w-0">

              <h1 className="truncate text-sm font-semibold">
                {task.title}
              </h1>

              <p className="mt-1 text-[10px] text-[#596474]">
                Task ID: {task.id}
              </p>

            </div>

          </div>

        </div>

        <div className="flex items-center gap-2">

          <TaskStatusBadge
            status={task.status}
          />

          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-lg border border-[#202733] bg-[#0e131a] px-3 text-[10px] text-[#8b95a5] hover:bg-[#151b24]"
          >
            <Play size={11} />
            Run
          </button>

        </div>

      </div>

    </header>
  );
}

/* ========================================================= */
/* TASK OVERVIEW                                             */
/* ========================================================= */

function TaskOverview({
  task,
}: {
  task: AgentTask;
}) {
  const completedSteps =
    task.steps.filter(
      (step) =>
        step.status ===
        "completed",
    ).length;

  return (
    <section>

      <div className="grid grid-cols-4 gap-3">

        <Metric
          label="Progress"
          value={`${task.progress}%`}
          icon={<Zap size={13} />}
        />

        <Metric
          label="Steps"
          value={`${completedSteps}/${task.steps.length}`}
          icon={<Check size={13} />}
        />

        <Metric
          label="Priority"
          value={capitalize(
            task.priority,
          )}
          icon={<ShieldCheck size={13} />}
        />

        <Metric
          label="Workspace"
          value={
            task.workspace
              ? "Connected"
              : "None"
          }
          icon={<Folder size={13} />}
        />

      </div>

      <div className="mt-4 rounded-2xl border border-[#202733] bg-[#0e131a] p-5">

        <div className="flex items-center gap-2">

          <Search
            size={14}
            className="text-[#9185ff]"
          />

          <h2 className="text-xs font-semibold">
            Agent request
          </h2>

        </div>

        <p className="mt-3 text-sm leading-6 text-[#a8b1bf]">
          {task.description}
        </p>

      </div>

    </section>
  );
}

/* ========================================================= */
/* EXECUTION PLAN                                            */
/* ========================================================= */

function ExecutionPlan({
  task,
}: {
  task: AgentTask;
}) {
  return (
    <section>

      <div className="mb-3 flex items-center justify-between">

        <div>

          <h2 className="text-sm font-semibold">
            Execution Plan
          </h2>

          <p className="mt-1 text-[10px] text-[#596474]">
            The agent's planned execution path
          </p>

        </div>

        <span className="text-[10px] text-[#596474]">
          {task.steps.length} steps
        </span>

      </div>

      <div className="rounded-2xl border border-[#202733] bg-[#0e131a]">

        {task.steps.map(
          (step, index) => (
            <ExecutionStep
              key={step.id}
              step={step}
              index={index}
              last={
                index ===
                task.steps.length - 1
              }
            />
          ),
        )}

      </div>

    </section>
  );
}

/* ========================================================= */
/* EXECUTION STEP                                           */
/* ========================================================= */

function ExecutionStep({
  step,
  index,
  last,
}: {
  step: TaskStep;
  index: number;
  last: boolean;
}) {
  return (
    <div
      className={`relative flex gap-4 p-5 ${
        !last
          ? "border-b border-[#202733]"
          : ""
      }`}
    >

      <div className="relative flex w-7 shrink-0 justify-center">

        {!last && (
          <div className="absolute top-8 h-[calc(100%+20px)] w-px bg-[#252d38]" />
        )}

        <StepIcon
          status={step.status}
          type={step.type}
        />

      </div>

      <div className="min-w-0 flex-1">

        <div className="flex items-start justify-between gap-4">

          <div>

            <div className="flex items-center gap-2">

              <span className="text-[9px] font-medium text-[#4e5968]">
                STEP {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="text-xs font-semibold text-[#dce2ea]">
                {step.title}
              </h3>

            </div>

            <p className="mt-2 text-[11px] leading-5 text-[#697384]">
              {step.description}
            </p>

          </div>

          <StepStatus
            status={step.status}
          />

        </div>

        {(step.tool ||
          step.mcpServer ||
          step.result) && (
          <div className="mt-3 rounded-xl border border-[#202733] bg-[#0a0f15] p-3">

            <div className="flex flex-wrap items-center gap-2">

              {step.mcpServer && (
                <span className="flex items-center gap-1.5 rounded-md border border-[#272d3a] bg-[#111720] px-2 py-1 text-[9px] text-[#8f99a8]">
                  <PlugIcon />
                  {step.mcpServer}
                </span>
              )}

              {step.tool && (
                <span className="flex items-center gap-1.5 rounded-md border border-[#272d3a] bg-[#111720] px-2 py-1 font-mono text-[9px] text-[#8f99a8]">
                  <Wrench size={9} />
                  {step.tool}
                </span>
              )}

            </div>

            {step.result && (
              <p className="mt-3 text-[10px] leading-5 text-[#657080]">
                {step.result}
              </p>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

/* ========================================================= */
/* ARTIFACTS                                                 */
/* ========================================================= */

function TaskArtifacts({
  task,
}: {
  task: AgentTask;
}) {
  return (
    <section>

      <div className="mb-3">

        <h2 className="text-sm font-semibold">
          Artifacts
        </h2>

        <p className="mt-1 text-[10px] text-[#596474]">
          Outputs produced during execution
        </p>

      </div>

      {task.artifacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#202733] p-8 text-center text-xs text-[#596474]">
          No artifacts produced yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">

          {task.artifacts.map(
            (artifact) => (
              <div
                key={artifact.id}
                className="rounded-xl border border-[#202733] bg-[#0e131a] p-4"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17152a]">
                    {artifact.type ===
                    "code" ? (
                      <FileCode2
                        size={14}
                        className="text-[#9185ff]"
                      />
                    ) : (
                      <FileCode2
                        size={14}
                        className="text-[#9185ff]"
                      />
                    )}
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-xs font-medium">
                      {artifact.name}
                    </p>

                    <p className="mt-1 truncate text-[9px] text-[#596474]">
                      {artifact.path}
                    </p>

                  </div>

                </div>

              </div>
            ),
          )}

        </div>
      )}

    </section>
  );
}

/* ========================================================= */
/* METRIC                                                   */
/* ========================================================= */

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-4">

      <div className="flex items-center gap-2 text-[#596474]">

        {icon}

        <span className="text-[9px] uppercase tracking-wide">
          {label}
        </span>

      </div>

      <p className="mt-2 text-sm font-semibold text-[#dce2ea]">
        {value}
      </p>

    </div>
  );
}

/* ========================================================= */
/* STATUS ICONS                                              */
/* ========================================================= */

function TaskStatusIcon({
  status,
}: {
  status: AgentTask["status"];
}) {
  if (status === "completed") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10251f] text-[#45c89a]">
        <Check size={13} />
      </div>
    );
  }

  if (
    status === "running" ||
    status === "planning"
  ) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#17152a] text-[#9185ff]">
        <Loader2
          size={13}
          className="animate-spin"
        />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#281719] text-[#ef7272]">
        <XCircle size={13} />
      </div>
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111720] text-[#697384]">
      <Circle size={11} />
    </div>
  );
}

function StepIcon({
  status,
  type,
}: {
  status: TaskStepStatus;
  type: TaskStep["type"];
}) {
  if (status === "completed") {
    return (
      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#275d4c] bg-[#10251f] text-[#45c89a]">
        <Check size={12} />
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#4b427d] bg-[#17152a] text-[#9185ff]">
        <Loader2
          size={12}
          className="animate-spin"
        />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#633235] bg-[#281719] text-[#ef7272]">
        <XCircle size={12} />
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#303845] bg-[#111720] text-[#596474]">
      {type === "tool" ||
      type === "mcp" ? (
        <Wrench size={11} />
      ) : type ===
        "verification" ? (
        <ShieldCheck size={11} />
      ) : (
        <Circle size={8} />
      )}
    </div>
  );
}

function StepStatus({
  status,
}: {
  status: TaskStepStatus;
}) {
  const config = {
    pending: {
      text: "Pending",
      className:
        "text-[#596474]",
    },

    running: {
      text: "Running",
      className:
        "text-[#9185ff]",
    },

    completed: {
      text: "Completed",
      className:
        "text-[#45c89a]",
    },

    failed: {
      text: "Failed",
      className:
        "text-[#ef7272]",
    },

    skipped: {
      text: "Skipped",
      className:
        "text-[#596474]",
    },
  }[status];

  return (
    <span
      className={`shrink-0 text-[9px] font-medium ${config.className}`}
    >
      {config.text}
    </span>
  );
}

function TaskStatusBadge({
  status,
}: {
  status: AgentTask["status"];
}) {
  const color =
    status === "completed"
      ? "text-[#45c89a] border-[#275d4c] bg-[#10251f]"
      : status === "failed"
        ? "text-[#ef7272] border-[#633235] bg-[#281719]"
        : "text-[#9185ff] border-[#4b427d] bg-[#17152a]";

  return (
    <span
      className={`rounded-lg border px-3 py-1.5 text-[9px] font-medium ${color}`}
    >
      {formatTaskStatus(status)}
    </span>
  );
}

function PlugIcon() {
  return (
    <PlugZapIcon />
  );
}

function PlugZapIcon() {
  return (
    <Zap
      size={9}
      className="text-[#9185ff]"
    />
  );
}

/* ========================================================= */
/* HELPERS                                                   */
/* ========================================================= */

function formatTaskStatus(
  status: AgentTask["status"],
) {
  switch (status) {
    case "queued":
      return "Queued";

    case "planning":
      return "Planning";

    case "running":
      return "Running";

    case "waiting":
      return "Waiting";

    case "completed":
      return "Completed";

    case "failed":
      return "Failed";

    case "cancelled":
      return "Cancelled";

    default:
      return "Unknown";
  }
}

function capitalize(
  value: string,
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}