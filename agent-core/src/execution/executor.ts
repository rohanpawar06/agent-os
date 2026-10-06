import type { AgentObservation, PlanStep } from "../agent/types.js";
import { CapabilityRouter } from "../capabilities/router.js";

export class Executor {
  constructor(private readonly router: CapabilityRouter) {}

  async execute(step: PlanStep): Promise<AgentObservation> {
    const attempt = step.attempts ?? 1;
    try {
      if (!step.tool) throw new Error(`Task "${step.title}" has no capability assigned.`);
      const output = await this.router.execute(step.tool, step.input ?? {});
      return { stepId: step.id, success: true, output, attempt, timestamp: new Date().toISOString() };
    } catch (error: unknown) {
      return {
        stepId: step.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        attempt,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
