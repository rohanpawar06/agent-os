export type AgentEventType =
  | "agent.started"
  | "agent.status_changed"
  | "agent.thinking"
  | "agent.completed"
  | "agent.error"

  | "message.created"
  | "message.delta"
  | "message.completed"

  | "task.created"
  | "task.started"
  | "task.progress"
  | "task.completed"
  | "task.failed"

  | "tool.started"
  | "tool.completed"
  | "tool.failed"

  | "mcp.connected"
  | "mcp.disconnected"

  | "memory.retrieved"
  | "memory.created"

  | "artifact.created"

  | "approval.required"
  | "approval.granted"
  | "approval.denied";

export interface AgentEvent<T = unknown> {
  id: string;

  type: AgentEventType;

  timestamp: string;

  agentId?: string;

  taskId?: string;

  data?: T;
}