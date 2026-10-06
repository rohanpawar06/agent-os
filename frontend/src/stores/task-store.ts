"use client";

import { create } from "zustand";

import type {
  AgentTask,
  TaskStatus,
  TaskStep,
  TaskStepStatus,
} from "@/types/task";

interface TaskStore {
  tasks: AgentTask[];

  activeTaskId: string | null;

  createTask: (
    task: AgentTask,
  ) => void;

  setActiveTask: (
    taskId: string | null,
  ) => void;

  updateTask: (
    taskId: string,
    updates: Partial<AgentTask>,
  ) => void;

  updateTaskStatus: (
    taskId: string,
    status: TaskStatus,
  ) => void;

  updateStep: (
    taskId: string,
    stepId: string,
    updates: Partial<TaskStep>,
  ) => void;

  addStep: (
    taskId: string,
    step: TaskStep,
  ) => void;

  getTask: (
    taskId: string,
  ) => AgentTask | undefined;

  getActiveTask: () => AgentTask | undefined;
}

const initialTask: AgentTask = {
  id: "task-workspace-analysis",

  title: "Analyze my workspace",

  description:
    "Inspect the AgentOS workspace, understand the current project structure, identify available capabilities, and report the current state.",

  status: "completed",

  priority: "normal",

  createdAt: new Date(
    Date.now() - 1000 * 60 * 12,
  ).toISOString(),

  startedAt: new Date(
    Date.now() - 1000 * 60 * 11,
  ).toISOString(),

  completedAt: new Date(
    Date.now() - 1000 * 60 * 2,
  ).toISOString(),

  progress: 100,

  currentStepId:
    "step-workspace-report",

  workspace:
    "C:\\Users\\rohan\\agent-os\\workspace",

  steps: [
    {
      id: "step-understand",

      taskId:
        "task-workspace-analysis",

      title: "Understand request",

      description:
        "Interpret the user's request and determine what information is required.",

      type: "reasoning",

      status: "completed",

      startedAt: new Date(
        Date.now() - 1000 * 60 * 11,
      ).toISOString(),

      completedAt: new Date(
        Date.now() - 1000 * 60 * 10,
      ).toISOString(),

      durationMs: 1800,

      result:
        "Workspace inspection is required.",
    },

    {
      id: "step-plan",

      taskId:
        "task-workspace-analysis",

      title: "Create execution plan",

      description:
        "Build a sequence of operations required to inspect the workspace.",

      type: "reasoning",

      status: "completed",

      startedAt: new Date(
        Date.now() - 1000 * 60 * 10,
      ).toISOString(),

      completedAt: new Date(
        Date.now() - 1000 * 60 * 9,
      ).toISOString(),

      durationMs: 2100,

      result:
        "Inspection plan created successfully.",
    },

    {
      id: "step-filesystem",

      taskId:
        "task-workspace-analysis",

      title: "Inspect workspace",

      description:
        "Use the connected Filesystem MCP capability to inspect the workspace.",

      type: "mcp",

      status: "completed",

      tool: "create_directory",

      mcpServer: "Filesystem MCP",

      startedAt: new Date(
        Date.now() - 1000 * 60 * 8,
      ).toISOString(),

      completedAt: new Date(
        Date.now() - 1000 * 60 * 7,
      ).toISOString(),

      durationMs: 4200,

      result:
        "Workspace inspection completed successfully.",
    },

    {
      id: "step-report",

      taskId:
        "task-workspace-analysis",

      title: "Generate workspace report",

      description:
        "Summarize the discovered project structure and available capabilities.",

      type: "verification",

      status: "completed",

      startedAt: new Date(
        Date.now() - 1000 * 60 * 6,
      ).toISOString(),

      completedAt: new Date(
        Date.now() - 1000 * 60 * 5,
      ).toISOString(),

      durationMs: 3200,

      result:
        "Workspace contains AgentOS project modules and MCP infrastructure.",
    },
  ],

  artifacts: [
    {
      id: "artifact-workspace-report",

      taskId:
        "task-workspace-analysis",

      name: "workspace-report.md",

      type: "report",

      path:
        "workspace/workspace-report.md",

      createdAt: new Date(
        Date.now() - 1000 * 60 * 4,
      ).toISOString(),
    },
  ],
};

export const useTaskStore =
  create<TaskStore>((set, get) => ({
    tasks: [initialTask],

    activeTaskId:
      initialTask.id,

    createTask: (task) =>
      set((state) => ({
        tasks: [
          task,
          ...state.tasks,
        ],

        activeTaskId: task.id,
      })),

    setActiveTask: (taskId) =>
      set({
        activeTaskId: taskId,
      }),

    updateTask: (
      taskId,
      updates,
    ) =>
      set((state) => ({
        tasks: state.tasks.map(
          (task) =>
            task.id === taskId
              ? {
                  ...task,
                  ...updates,
                }
              : task,
        ),
      })),

    updateTaskStatus: (
      taskId,
      status,
    ) =>
      set((state) => ({
        tasks: state.tasks.map(
          (task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                }
              : task,
        ),
      })),

    updateStep: (
      taskId,
      stepId,
      updates,
    ) =>
      set((state) => ({
        tasks: state.tasks.map(
          (task) =>
            task.id === taskId
              ? {
                  ...task,

                  steps: task.steps.map(
                    (step) =>
                      step.id === stepId
                        ? {
                            ...step,
                            ...updates,
                          }
                        : step,
                  ),
                }
              : task,
        ),
      })),

    addStep: (
      taskId,
      step,
    ) =>
      set((state) => ({
        tasks: state.tasks.map(
          (task) =>
            task.id === taskId
              ? {
                  ...task,

                  steps: [
                    ...task.steps,
                    step,
                  ],
                }
              : task,
        ),
      })),

    getTask: (taskId) =>
      get().tasks.find(
        (task) =>
          task.id === taskId,
      ),

    getActiveTask: () => {
      const {
        tasks,
        activeTaskId,
      } = get();

      return tasks.find(
        (task) =>
          task.id === activeTaskId,
      );
    },
  }));