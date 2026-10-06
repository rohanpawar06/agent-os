import type { AgentObservation, AgentRequest, CapabilityDefinition, ExecutionPlan, PlanStep } from "../agent/types.js";
import type { MemoryRecord } from "../memory/memory-manager.js";
import type { PlannerContract } from "./planner.js";

export interface ReplanInput {
  request: AgentRequest;
  currentPlan: ExecutionPlan;
  completedSteps: PlanStep[];
  failedStep: PlanStep;
  failure: AgentObservation;
  capabilities: CapabilityDefinition[];
  memories: MemoryRecord[];
  signal?: AbortSignal;
}

export interface ReplannerContract {
  replan(input: ReplanInput): Promise<ExecutionPlan>;
}

export class Replanner implements ReplannerContract {
  constructor(private readonly planner: PlannerContract) {}

  async replan(input: ReplanInput): Promise<ExecutionPlan> {
    const failure = [
      `The step "${input.failedStep.title}" using ${input.failedStep.tool ?? "no capability"} failed.`,
      `Error: ${input.failure.error ?? "unknown failure"}`,
      "Choose an available alternative or a safe sequence of remaining steps. Do not repeat completed actions.",
    ].join(" ");
    const plan = await this.planner.createPlan(
      input.request,
      input.capabilities,
      input.memories,
      { completedSteps: input.completedSteps, failure, signal: input.signal },
    );
    const completedSignatures = new Set(input.completedSteps.map((step) => signature(step)));
    const remaining = plan.steps.filter((step) => !completedSignatures.has(signature(step)));
    if (remaining.length === 0) {
      throw new Error("Replanner only returned operations that were already completed.");
    }
    return { ...plan, steps: remaining };
  }
}

function signature(step: PlanStep): string {
  return `${step.tool ?? ""}:${JSON.stringify(step.input ?? {})}`;
}
