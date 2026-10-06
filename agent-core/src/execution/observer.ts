import type { AgentObservation, PlanStep } from "../agent/types.js";
import { EventBus } from "../events/event-bus.js";

export interface ObservationEvaluation {
  success: boolean;
  continueExecution: boolean;
  shouldReplan: boolean;
  reason?: string;
}

export class Observer {
  constructor(private readonly events?: EventBus) {}

  evaluate(step: PlanStep, observation: AgentObservation, requestId?: string): ObservationEvaluation {
    if (this.events && requestId) {
      this.events.emit({
        type: "observation.received",
        at: observation.timestamp,
        requestId,
        observation,
      });
    }
    if (!observation.success) {
      return {
        success: false,
        continueExecution: false,
        shouldReplan: true,
        reason: observation.error ?? `Task "${step.title}" failed.`,
      };
    }
    return { success: true, continueExecution: true, shouldReplan: false };
  }
}
