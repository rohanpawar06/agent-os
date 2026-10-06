import type { CapabilityDefinition } from "../agent/types.js";
import { MCPClient } from "../mcp/client.js";
import { CapabilityRegistry } from "./registry.js";

export class CapabilityRouter {
  constructor(private readonly registry: CapabilityRegistry, private readonly mcpClient: MCPClient) {}

  async execute(name: string, input: Record<string, unknown>): Promise<unknown> {
    const capability = this.registry.get(name);
    if (!capability) throw new Error(`Capability "${name}" is not registered.`);
    this.validateInput(capability, input);
    if (capability.source !== "mcp") throw new Error(`No executor is registered for native capability "${name}".`);
    return this.mcpClient.callTool(name, input);
  }

  private validateInput(capability: CapabilityDefinition, input: Record<string, unknown>): void {
    const additionalProperties = capability.inputSchema.additionalProperties;
    const properties = capability.inputSchema.properties;
    if (additionalProperties === false && properties && typeof properties === "object" && !Array.isArray(properties)) {
      for (const field of Object.keys(input)) {
        if (!(field in properties)) throw new Error(`Capability "${capability.name}" does not accept input "${field}".`);
      }
    }
    const required = capability.inputSchema.required;
    if (Array.isArray(required)) {
      for (const field of required) {
        if (typeof field === "string" && !(field in input)) {
          throw new Error(`Capability "${capability.name}" requires input "${field}".`);
        }
      }
    }

    if (!properties || typeof properties !== "object" || Array.isArray(properties)) return;
    for (const [field, value] of Object.entries(input)) {
      const property = (properties as Record<string, unknown>)[field];
      if (!property || typeof property !== "object" || Array.isArray(property)) continue;
      const expected = (property as Record<string, unknown>).type;
      if (typeof expected !== "string") continue;
      const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
      if (expected !== actual && !(expected === "integer" && typeof value === "number" && Number.isInteger(value))) {
        throw new Error(`Capability "${capability.name}" input "${field}" must be ${expected}.`);
      }
    }
  }
}
