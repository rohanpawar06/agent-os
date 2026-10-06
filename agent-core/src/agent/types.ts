export type AgentStatus =
  | "idle"
  | "thinking"
  | "planning"
  | "executing"
  | "observing"
  | "waiting"
  | "completed"
  | "failed";

export type StepStatus =
  | "pending"
  | "running"
  | "retrying"
  | "completed"
  | "failed"
  | "skipped";

/** Capability names are discovered dynamically from the connected MCP servers. */
export type ToolName = string;

export interface AgentRequest {
  id: string;
  message: string;
  createdAt: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  tool?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  attempts?: number;
}

export interface ExecutionPlan {
  id: string;
  requestId: string;
  goal: string;
  steps: PlanStep[];
  createdAt: string;
}

export interface AgentObservation {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  attempt?: number;
  timestamp: string;
}

export interface AgentResult {
  success: boolean;
  message: string;
  requestId?: string;
  plan?: ExecutionPlan;
  observations: AgentObservation[];
}

export interface AgentState {
  status: AgentStatus;
  request?: AgentRequest;
  plan?: ExecutionPlan;
  currentStep?: PlanStep;
  observations: AgentObservation[];
}

export interface ToolExecutionResult {
  success: boolean;
  tool?: ToolName;
  output?: unknown;
  error?: string;
}

export interface CapabilityDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source: "mcp" | "native";
}
