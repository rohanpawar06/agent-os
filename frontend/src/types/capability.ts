export type CapabilityStatus =
  | "available"
  | "connected"
  | "disconnected"
  | "error";

export interface ToolDefinition {
  name: string;
  description: string;

  inputSchema?: Record<string, unknown>;
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

  metadata?: Record<string, unknown>;
}