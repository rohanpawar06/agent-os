import type { PlanStep } from "../agent/types.js";

export interface Evaluation {
  success: boolean;
  message: string;
}

export interface EvaluatorContract {
  evaluate(tasks: PlanStep[]): Evaluation;
}

export class Evaluator implements EvaluatorContract {
  evaluate(tasks: PlanStep[]): Evaluation {
    if (tasks.length === 0) return { success: false, message: "The plan contained no executable tasks." };
    const failed = tasks.find((task) => task.status !== "completed");
    if (failed) {
      return {
        success: false,
        message: failed.error ? `Task "${failed.title}" failed: ${failed.error}` : `Task "${failed.title}" did not complete.`,
      };
    }
    return { success: true, message: "AgentOS completed the requested goal successfully." };
  }
}
