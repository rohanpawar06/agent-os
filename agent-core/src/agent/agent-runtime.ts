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

  run(message: string, options: RunOptions = {}): Promise<AgentResult> {
    return this.kernel.run(message, options);
  }
}
