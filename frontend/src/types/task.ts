export type TaskStatus =
  | "queued"
  | "planning"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type TaskStepType =
  | "reasoning"
  | "tool"
  | "mcp"
  | "verification"
  | "artifact"
  | "user_approval";

export interface TaskStep {
  id: string;

  taskId: string;

  title: string;

  description: string;

  type: TaskStepType;

  status: TaskStepStatus;

  tool?: string;

  mcpServer?: string;

  startedAt?: string;

  completedAt?: string;

  durationMs?: number;

  result?: string;

  error?: string;
}

export interface TaskArtifact {
  id: string;

  taskId: string;

  name: string;

  type:
    | "file"
    | "folder"
    | "code"
    | "report"
    | "other";

  path?: string;

  size?: number;

  createdAt: string;
}

export interface AgentTask {
  id: string;

  title: string;

  description: string;

  status: TaskStatus;

  priority:
    | "low"
    | "normal"
    | "high"
    | "critical";

  createdAt: string;

  startedAt?: string;

  completedAt?: string;

  progress: number;

  currentStepId?: string;

  steps: TaskStep[];

  artifacts: TaskArtifact[];

  workspace?: string;

  error?: string;
}

export type Task = AgentTask;