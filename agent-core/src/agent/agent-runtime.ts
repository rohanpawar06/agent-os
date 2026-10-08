import { AgentKernel, type AgentKernelOptions, type RunOptions } from "../kernel/agent-kernel.js";
import type { AgentResult, AgentState } from "./types.js";

/** Compatibility facade kept for the original AgentLoop entry point. */
export class AgentRuntime {
  readonly kernel: AgentKernel;

  constructor(options: AgentKernelOptions = {}) {
    this.kernel = new AgentKernel(options);
  }

  getState(): AgentState {
    return this.kernel.getState();
  }

  setModel(model: string): void {
    this.kernel.setModel(model);
  }

  getMemories() {
    return this.kernel.getMemories();
  }

  clearMemories(): Promise<void> {
    return this.kernel.clearMemories();
  }

  run(message: string, options: RunOptions = {}): Promise<AgentResult> {
    return this.kernel.run(message, options);
  }
}
