import { EventBus } from "../events/event-bus.js";

export type GoalStatus = "pending" | "in_progress" | "completed" | "failed";

export interface GoalRecord {
  id: string;
  requestId: string;
  text: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export class GoalManager {
  private readonly goals = new Map<string, GoalRecord>();

  constructor(private readonly events: EventBus) {}

  create(requestId: string, text: string): GoalRecord {
    const at = new Date().toISOString();
    const goal: GoalRecord = {
      id: crypto.randomUUID(), requestId, text, status: "pending", createdAt: at, updatedAt: at,
    };
    this.goals.set(goal.id, goal);
    this.events.emit({ type: "goal.created", at, goalId: goal.id, requestId, text });
    return { ...goal };
  }

  start(goalId: string): GoalRecord {
    return this.update(goalId, "in_progress");
  }

  complete(goalId: string): GoalRecord {
    return this.update(goalId, "completed");
  }

  fail(goalId: string, error: string): GoalRecord {
    return this.update(goalId, "failed", error);
  }

  get(goalId: string): GoalRecord | undefined {
    const goal = this.goals.get(goalId);
    return goal ? { ...goal } : undefined;
  }

  private update(goalId: string, status: Exclude<GoalStatus, "pending">, error?: string): GoalRecord {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Unknown goal: ${goalId}`);
    if (goal.status === "completed" || goal.status === "failed") {
      throw new Error(`Goal ${goalId} is already ${goal.status}.`);
    }
    goal.status = status;
    goal.updatedAt = new Date().toISOString();
    if (error) goal.error = error;
    this.events.emit({
      type: "goal.updated", at: goal.updatedAt, goalId, status, ...(error ? { error } : {}),
    });
    return { ...goal };
  }
}
