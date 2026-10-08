import { AgentRuntime } from "./agent-runtime.js";
import type { AgentResult, AgentState, CapabilityDefinition } from "./types.js";
import type { RunOptions } from "../kernel/agent-kernel.js";

export class AgentLoop {
  private readonly runtime: AgentRuntime;

  constructor(runtime = new AgentRuntime()) {
    this.runtime = runtime;
  }

  async execute(message: string, options: RunOptions = {}): Promise<AgentResult> {
    if (!message.trim()) {
      return { success: false, message: "Agent request cannot be empty.", observations: [] };
    }
    return this.runtime.run(message.trim(), options);
  }

  getState(): AgentState {
    return this.runtime.getState();
  }

  getCapabilities(): CapabilityDefinition[] {
    return this.runtime.kernel.capabilities.list();
  }

  setModel(model: string): void {
    this.runtime.setModel(model);
  }

  getMemories() {
    return this.runtime.getMemories();
  }

  clearMemories(): Promise<void> {
    return this.runtime.clearMemories();
  }
}
