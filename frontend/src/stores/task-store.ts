"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useTaskStore =
  create<TaskStore>()(persist((set, get) => ({
    tasks: [],

    activeTaskId: null,

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
  }), {
    name: "agentos-task-state",
    partialize: (state) => ({ tasks: state.tasks, activeTaskId: state.activeTaskId }),
    skipHydration: true,
  }));
