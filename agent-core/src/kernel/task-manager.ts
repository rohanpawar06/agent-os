import type { PlanStep, StepStatus } from "../agent/types.js";
import { EventBus } from "../events/event-bus.js";

interface ManagedTask {
  requestId: string;
  step: PlanStep;
}

export class TaskManager {
  private readonly tasks = new Map<string, ManagedTask>();

  constructor(private readonly events: EventBus) {}

  add(requestId: string, steps: PlanStep[]): PlanStep[] {
    const added: PlanStep[] = [];
    for (const source of steps) {
      if (this.tasks.has(source.id)) throw new Error(`Duplicate task id: ${source.id}`);
      const step: PlanStep = { ...source, status: "pending" };
      this.tasks.set(step.id, { requestId, step });
      added.push({ ...step });
      this.events.emit({ type: "task.created", at: new Date().toISOString(), requestId, task: { ...step } });
    }
    return added;
  }

  get(taskId: string): PlanStep | undefined {
    const task = this.tasks.get(taskId)?.step;
    return task ? { ...task } : undefined;
  }

  list(requestId?: string): PlanStep[] {
    return [...this.tasks.values()]
      .filter((task) => requestId === undefined || task.requestId === requestId)
      .map(({ step }) => ({ ...step }));
  }

  start(taskId: string): PlanStep {
    const step = this.require(taskId);
    if (step.status !== "pending" && step.status !== "retrying") {
      throw new Error(`Task ${taskId} cannot start from ${step.status}.`);
    }
    step.status = "running";
    step.attempts = (step.attempts ?? 0) + 1;
    this.publish(taskId);
    return { ...step };
  }

  retry(taskId: string, error: string): PlanStep {
    const step = this.require(taskId);
    if (step.status !== "running") throw new Error(`Task ${taskId} cannot retry from ${step.status}.`);
    step.status = "retrying";
    step.error = error;
    const managed = this.tasks.get(taskId)!;
    this.events.emit({
      type: "task.retrying", at: new Date().toISOString(), requestId: managed.requestId,
      taskId, attempt: step.attempts ?? 1, error,
    });
    this.publish(taskId);
    return { ...step };
  }

  complete(taskId: string, output: unknown): PlanStep {
    const step = this.require(taskId);
    if (step.status !== "running") throw new Error(`Task ${taskId} cannot complete from ${step.status}.`);
    step.status = "completed";
    step.output = output;
    delete step.error;
    this.publish(taskId);
    return { ...step };
  }

  fail(taskId: string, error: string): PlanStep {
    const step = this.require(taskId);
    if (step.status !== "running" && step.status !== "retrying") {
      throw new Error(`Task ${taskId} cannot fail from ${step.status}.`);
    }
    step.status = "failed";
    step.error = error;
    this.publish(taskId);
    return { ...step };
  }

  skip(taskId: string, reason: string): PlanStep {
    const step = this.require(taskId);
    if (step.status !== "pending") throw new Error(`Task ${taskId} cannot be skipped from ${step.status}.`);
    step.status = "skipped";
    step.error = reason;
    this.publish(taskId);
    return { ...step };
  }

  private require(taskId: string): PlanStep {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    return task.step;
  }

  private publish(taskId: string): void {
    const managed = this.tasks.get(taskId)!;
    const status: StepStatus = managed.step.status;
    this.events.emit({
      type: "task.updated", at: new Date().toISOString(), requestId: managed.requestId,
      taskId, status, ...(managed.step.error ? { error: managed.step.error } : {}),
    });
  }
}
