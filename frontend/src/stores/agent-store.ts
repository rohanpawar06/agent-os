"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  Agent,
  AgentStatus,
  ChatMessage,
  Activity,
  Task,
  Capability,
  Artifact,
} from "@/types";
import { getAgentOsBrowserStorage } from "@/lib/api";

interface AgentStore {
  // -----------------------------
  // Agent
  // -----------------------------

  agent: Agent;

  setAgentStatus: (status: AgentStatus) => void;

  // -----------------------------
  // Chat
  // -----------------------------

  messages: ChatMessage[];

  addMessage: (message: ChatMessage) => void;

  updateMessage: (
    messageId: string,
    content: string,
  ) => void;

  clearMessages: () => void;

  // -----------------------------
  // Activity
  // -----------------------------

  activities: Activity[];

  addActivity: (activity: Activity) => void;

  updateActivity: (
    activityId: string,
    updates: Partial<Activity>,
  ) => void;

  clearActivities: () => void;

  // -----------------------------
  // Tasks
  // -----------------------------

  tasks: Task[];

  addTask: (task: Task) => void;

  updateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => void;

  // -----------------------------
  // Capabilities
  // -----------------------------

  capabilities: Capability[];

  setCapabilities: (
    capabilities: Capability[],
  ) => void;

  // -----------------------------
  // Artifacts
  // -----------------------------

  artifacts: Artifact[];

  addArtifact: (artifact: Artifact) => void;

  clearArtifacts: () => void;

  // -----------------------------
  // Runtime
  // -----------------------------

  runtime: {
    reasoning: "ready" | "active" | "waiting" | "error";
    memory: "connected" | "searching" | "disconnected" | "error";
    mcp: "connected" | "connecting" | "disconnected" | "error";
  };

  setRuntime: (
    updates: Partial<AgentStore["runtime"]>,
  ) => void;

  // -----------------------------
  // UI
  // -----------------------------

  isChatLoading: boolean;

  setChatLoading: (loading: boolean) => void;

  isPaused: boolean;

  setPaused: (paused: boolean) => void;
}

const defaultAgent: Agent = {
  id: "agentos-core",
  name: "AgentOS Core",
  status: "idle",
  mode: "autonomous",
  model: "qwen2.5:latest",
  description:
    "Autonomous intelligence environment",
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I can answer questions with the configured model and work with the files, documents, and spreadsheets available to your AgentOS account.",
    createdAt: new Date().toISOString(),
  },
];

export const useAgentStore = create<AgentStore>()(
  persist((set) => ({
    // -----------------------------
    // Agent
    // -----------------------------

    agent: defaultAgent,

    setAgentStatus: (status) =>
      set((state) => ({
        agent: {
          ...state.agent,
          status,
        },
      })),

    // -----------------------------
    // Chat
    // -----------------------------

    messages: initialMessages,

    addMessage: (message) =>
      set((state) => ({
        messages: [
          ...state.messages,
          message,
        ],
      })),

    updateMessage: (
      messageId,
      content,
    ) =>
      set((state) => ({
        messages: state.messages.map(
          (message) =>
            message.id === messageId
              ? {
                  ...message,
                  content,
                }
              : message,
        ),
      })),

    clearMessages: () =>
      set({
        messages: [],
      }),

    // -----------------------------
    // Activity
    // -----------------------------

    activities: [],

    addActivity: (activity) =>
      set((state) => ({
        activities: [
          activity,
          ...state.activities,
        ],
      })),

    updateActivity: (
      activityId,
      updates,
    ) =>
      set((state) => ({
        activities: state.activities.map(
          (activity) =>
            activity.id === activityId
              ? {
                  ...activity,
                  ...updates,
                }
              : activity,
        ),
      })),

    clearActivities: () =>
      set({
        activities: [],
      }),

    // -----------------------------
    // Tasks
    // -----------------------------

    tasks: [],

    addTask: (task) =>
      set((state) => ({
        tasks: [
          ...state.tasks,
          task,
        ],
      })),

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

    // -----------------------------
    // Capabilities
    // -----------------------------

    capabilities: [],

    setCapabilities: (
      capabilities,
    ) =>
      set({
        capabilities,
      }),

    // -----------------------------
    // Artifacts
    // -----------------------------

    artifacts: [],

    addArtifact: (artifact) =>
      set((state) => ({
        artifacts: [
          ...state.artifacts,
          artifact,
        ],
      })),

    clearArtifacts: () =>
      set({
        artifacts: [],
      }),

    // -----------------------------
    // Runtime
    // -----------------------------

    runtime: {
      reasoning: "waiting",
      memory: "disconnected",
      mcp: "disconnected",
    },

    setRuntime: (updates) =>
      set((state) => ({
        runtime: {
          ...state.runtime,
          ...updates,
        },
      })),

    // -----------------------------
    // UI
    // -----------------------------

    isChatLoading: false,

    setChatLoading: (loading) =>
      set({
        isChatLoading: loading,
      }),

    isPaused: false,

    setPaused: (paused) =>
      set({
        isPaused: paused,
      }),
  }), {
    name: "agentos-chat-state",
    storage: createJSONStorage(() => getAgentOsBrowserStorage()),
    partialize: (state) => ({
      messages: state.messages,
      activities: state.activities,
      artifacts: state.artifacts,
    }),
    skipHydration: true,
  }),
);
