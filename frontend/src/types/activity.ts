export type ActivityType =
  | "agent"
  | "task"
  | "tool"
  | "mcp"
  | "memory"
  | "artifact"
  | "approval"
  | "system"
  | "error";

export type ActivityStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export interface Activity {
  id: string;

  type: ActivityType;

  title: string;
  description?: string;

  status: ActivityStatus;

  createdAt: string;

  taskId?: string;
  toolName?: string;
  mcpServer?: string;

  metadata?: Record<string, unknown>;
}