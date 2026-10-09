export type CapabilityStatus =
  | "available"
  | "connected"
  | "disconnected"
  | "error"
  | "permission_required"
  | "requires_connector";

export interface ToolDefinition {
  name: string;
  description: string;

  inputSchema?: Record<string, unknown>;
  enabled?: boolean;
  permission?: string;
  status?: CapabilityStatus;
}

export interface Capability {
  id: string;

  name: string;

  description: string;

  status: CapabilityStatus;

  type:
    | "mcp"
    | "builtin"
    | "integration"
    | "model";

  tools: ToolDefinition[];

  configuration?: string;

  enabledToolCount?: number;

  metadata?: Record<string, unknown>;
}
