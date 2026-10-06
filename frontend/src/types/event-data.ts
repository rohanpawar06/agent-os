export interface ToolStartedData {
  toolName: string;

  server?: string;

  input?: unknown;
}

export interface ToolCompletedData {
  toolName: string;

  server?: string;

  output?: unknown;

  durationMs?: number;
}

export interface ToolFailedData {
  toolName: string;

  server?: string;

  error: string;
}

export interface TaskProgressData {
  progress: number;

  message?: string;
}

export interface AgentStatusChangedData {
  status: string;

  message?: string;
}

export interface MessageDeltaData {
  messageId: string;

  delta: string;
}

export interface ApprovalRequiredData {
  action: string;

  reason: string;

  toolName?: string;

  input?: unknown;
}