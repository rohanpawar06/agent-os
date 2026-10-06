import type { CapabilityDefinition } from "../agent/types.js";

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, CapabilityDefinition>();

  register(definition: CapabilityDefinition): void {
    if (!definition.name.trim()) throw new Error("Capability name cannot be empty.");
    this.capabilities.set(definition.name, { ...definition, inputSchema: { ...definition.inputSchema } });
  }

  replaceFromMcp(definitions: CapabilityDefinition[]): void {
    for (const [name, capability] of this.capabilities) {
      if (capability.source === "mcp") this.capabilities.delete(name);
    }
    for (const definition of definitions) this.register(definition);
  }

  get(name: string): CapabilityDefinition | undefined {
    const capability = this.capabilities.get(name);
    return capability ? { ...capability, inputSchema: { ...capability.inputSchema } } : undefined;
  }

  list(): CapabilityDefinition[] {
    return [...this.capabilities.values()].map((capability) => ({
      ...capability,
      inputSchema: { ...capability.inputSchema },
    }));
  }
}
