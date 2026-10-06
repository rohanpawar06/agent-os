export type AgentStatus =
  | "offline"
  | "connecting"
  | "idle"
  | "thinking"
  | "planning"
  | "executing"
  | "waiting"
  | "completed"
  | "error";

export type AgentMode =
  | "autonomous"
  | "assisted"
  | "manual";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  mode: AgentMode;
  model?: string;
  description?: string;
}