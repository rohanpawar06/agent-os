import type { AgentStatus } from "../agent/types.js";
import { EventBus } from "../events/event-bus.js";

const ALLOWED_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  idle: ["thinking"],
  thinking: ["planning", "failed"],
  planning: ["executing", "completed", "failed"],
  executing: ["observing", "planning", "completed", "failed"],
  observing: ["executing", "planning", "completed", "failed"],
  waiting: ["executing", "planning", "failed"],
  completed: ["thinking"],
  failed: ["thinking"],
};

export class Lifecycle {
  private status: AgentStatus = "idle";

  constructor(private readonly events: EventBus) {}

  getStatus(): AgentStatus {
    return this.status;
  }

  transition(status: AgentStatus, requestId: string): void {
    if (status === this.status) return;
    if (!ALLOWED_TRANSITIONS[this.status].includes(status)) {
      throw new Error(`Invalid AgentOS lifecycle transition: ${this.status} → ${status}.`);
    }
    const previous = this.status;
    this.status = status;
    this.events.emit({
      type: "agent.status.changed",
      at: new Date().toISOString(),
      requestId,
      previous,
      status,
    });
  }
}
