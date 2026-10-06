"use client";

import { create } from "zustand";

import type {
  Agent,
  AgentStatus,
  ChatMessage,
  Activity,
  Task,
  Capability,
  Artifact,
} from "@/types";

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
    reasoning: "ready" | "active" | "waiting";
    memory: "connected" | "searching" | "error";
    mcp: "connected" | "connecting" | "error";
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
  model: "AgentOS",
  description:
    "Autonomous intelligence environment",
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hello! I am AgentOS Core. I can reason about tasks, use connected capabilities, work with your workspace, remember context, and execute multi-step workflows.",
    createdAt: new Date().toISOString(),
  },
];

const initialCapabilities: Capability[] = [
  {
    id: "filesystem-mcp",
    name: "Filesystem MCP",
    description:
      "Tool provider for workspace filesystem operations.",
    status: "connected",
    type: "mcp",
    tools: [
      {
        name: "create_directory",
        description:
          "Create a directory inside the AgentOS workspace.",
      },
    ],
  },
];

export const useAgentStore = create<AgentStore>(
  (set) => ({
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

    capabilities:
      initialCapabilities,

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
      reasoning: "ready",
      memory: "connected",
      mcp: "connected",
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
  }),
);