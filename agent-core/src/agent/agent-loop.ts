import { AgentRuntime } from "./agent-runtime.js";
import type { AgentResult, AgentState } from "./types.js";

export class AgentLoop {
  private readonly runtime: AgentRuntime;

  constructor(runtime = new AgentRuntime()) {
    this.runtime = runtime;
  }

  async execute(message: string): Promise<AgentResult> {
    if (!message.trim()) {
      return { success: false, message: "Agent request cannot be empty.", observations: [] };
    }
    return this.runtime.run(message.trim());
  }

  getState(): AgentState {
    return this.runtime.getState();
  }
}
