import type { AgentObservation, AgentStatus, PlanStep, StepStatus } from "../agent/types.js";

export type AgentEvent =
  | { type: "agent.status.changed"; at: string; requestId: string; previous: AgentStatus; status: AgentStatus }
  | { type: "goal.created"; at: string; goalId: string; requestId: string; text: string }
  | { type: "goal.updated"; at: string; goalId: string; status: "in_progress" | "completed" | "failed"; error?: string }
  | { type: "plan.created"; at: string; requestId: string; planId: string; taskCount: number }
  | { type: "task.created"; at: string; requestId: string; task: PlanStep }
  | { type: "task.updated"; at: string; requestId: string; taskId: string; status: StepStatus; error?: string }
  | { type: "task.retrying"; at: string; requestId: string; taskId: string; attempt: number; error: string }
  | { type: "observation.received"; at: string; requestId: string; observation: AgentObservation }
  | { type: "agent.completed"; at: string; requestId: string; message: string }
  | { type: "agent.failed"; at: string; requestId: string; error: string }
  | { type: "memory.recorded"; at: string; requestId: string; memoryId: string };

export type AgentEventType = AgentEvent["type"];
export type AgentEventOf<T extends AgentEventType> = Extract<AgentEvent, { type: T }>;
