import type { AgentObservation, AgentRequest, CapabilityDefinition, ExecutionPlan, PlanStep } from "../agent/types.js";
import type { MemoryRecord } from "../memory/memory-manager.js";
import type { ReplannerContract } from "../brain/replanner.js";
import { EvaluatorContract } from "../brain/evaluator.js";
import { EventBus } from "../events/event-bus.js";
import { Executor } from "../execution/executor.js";
import { Observer } from "../execution/observer.js";
import { RecoveryManager } from "../execution/recovery-manager.js";
import { Lifecycle } from "./lifecycle.js";
import { TaskManager } from "./task-manager.js";

export interface ExecutionOutcome {
  success: boolean;
  message: string;
  plan: ExecutionPlan;
  observations: AgentObservation[];
}

export class ExecutionController {
  private readonly maxReplans = parseNonNegativeInteger(process.env.AGENTOS_MAX_REPLANS, 1);

  constructor(
    private readonly events: EventBus,
    private readonly lifecycle: Lifecycle,
    private readonly tasks: TaskManager,
    private readonly executor: Executor,
    private readonly observer: Observer,
    private readonly recovery: RecoveryManager,
    private readonly replanner: ReplannerContract,
    private readonly evaluator: EvaluatorContract,
  ) {}

  async execute(
    plan: ExecutionPlan,
    request: AgentRequest,
    capabilities: CapabilityDefinition[],
    memories: MemoryRecord[],
    signal?: AbortSignal,
  ): Promise<ExecutionOutcome> {
    let queue = this.tasks.add(request.id, plan.steps).map((step) => step.id);
    const observations: AgentObservation[] = [];
    let replans = 0;
    this.events.emit({ type: "plan.created", at: new Date().toISOString(), requestId: request.id, planId: plan.id, taskCount: queue.length });

    while (queue.length > 0) {
      if (signal?.aborted) throw signal.reason ?? new Error("Agent request was cancelled.");
      const taskId = queue.shift()!;
      if (this.lifecycle.getStatus() !== "executing") this.lifecycle.transition("executing", request.id);
      let step = this.tasks.start(taskId);
      let observation = await this.executor.execute(step);

      while (this.recovery.shouldRetry(observation)) {
        this.tasks.retry(taskId, observation.error ?? "Transient execution failure.");
        try {
          await this.recovery.waitBeforeRetry(observation.attempt ?? 1, signal);
        } catch (error) {
          this.tasks.fail(taskId, error instanceof Error ? error.message : String(error));
          throw error;
        }
        step = this.tasks.start(taskId);
        observation = await this.executor.execute(step);
      }

      observations.push(observation);
      this.lifecycle.transition("observing", request.id);
      const evaluation = this.observer.evaluate(step, observation, request.id);
      if (evaluation.success) {
        this.tasks.complete(taskId, observation.output);
        continue;
      }

      this.tasks.fail(taskId, evaluation.reason ?? "Task failed.");
      if (!evaluation.shouldReplan || replans >= this.maxReplans) {
        for (const pendingId of queue) this.tasks.skip(pendingId, "Not run because an earlier task failed.");
        queue = [];
        break;
      }

      const remaining = queue;
      for (const pendingId of remaining) this.tasks.skip(pendingId, "Superseded by a replan after an earlier task failed.");
      queue = [];
      replans += 1;
      this.lifecycle.transition("planning", request.id);
      const completedSteps = this.tasks.list(request.id).filter((task) => task.status === "completed");
      const replacement = await this.replanner.replan({
        request,
        currentPlan: { ...plan, steps: this.tasks.list(request.id) },
        completedSteps,
        failedStep: step,
        failure: observation,
        capabilities,
        memories,
        signal,
      });
      if (replacement.steps.length === 0) break;
      const added = this.tasks.add(request.id, replacement.steps);
      queue = added.map((task) => task.id);
      plan = { ...plan, steps: this.tasks.list(request.id) };
      this.events.emit({
        type: "plan.created", at: new Date().toISOString(), requestId: request.id,
        planId: replacement.id, taskCount: added.length,
      });
      this.lifecycle.transition("executing", request.id);
    }

    const finalTasks = this.tasks.list(request.id);
    const finalPlan: ExecutionPlan = { ...plan, steps: finalTasks };
    const finalEvaluation = this.evaluator.evaluate(finalTasks);
    return { success: finalEvaluation.success, message: finalEvaluation.message, plan: finalPlan, observations };
  }
}

function parseNonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
