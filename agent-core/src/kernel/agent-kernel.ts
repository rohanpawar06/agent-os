import type {
  AgentObservation,
  AgentRequest,
  AgentResult,
  AgentState,
  CapabilityDefinition,
  ExecutionPlan,
  PlanStep,
} from "../agent/types.js";
import { Evaluator } from "../brain/evaluator.js";
import { OllamaClient } from "../brain/ollama-client.js";
import { Planner } from "../brain/planner.js";
import type { PlannerContract } from "../brain/planner.js";
import { Replanner } from "../brain/replanner.js";
import { CapabilityRegistry } from "../capabilities/registry.js";
import { CapabilityRouter } from "../capabilities/router.js";
import { EventBus } from "../events/event-bus.js";
import { Executor } from "../execution/executor.js";
import { Observer } from "../execution/observer.js";
import { RecoveryManager } from "../execution/recovery-manager.js";
import { MCPClient } from "../mcp/client.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { JsonFileMemoryStore } from "../memory/persistent-memory-store.js";
import { ExecutionController } from "./execution-controller.js";
import { GoalManager } from "./goal-manager.js";
import { Lifecycle } from "./lifecycle.js";
import { TaskManager } from "./task-manager.js";

export interface AgentKernelOptions {
  events?: EventBus;
  mcpClient?: MCPClient;
  ollamaClient?: OllamaClient;
  planner?: PlannerContract;
  memory?: MemoryManager;
}

export interface RunOptions {
  signal?: AbortSignal;
}

export class AgentKernel {
  readonly events: EventBus;
  readonly goals: GoalManager;
  readonly tasks: TaskManager;
  readonly memory: MemoryManager;
  readonly capabilities: CapabilityRegistry;

  private readonly lifecycle: Lifecycle;
  private readonly mcpClient: MCPClient;
  private readonly planner: PlannerContract;
  private readonly ollama: OllamaClient;
  private readonly controller: ExecutionController;
  private state: AgentState = { status: "idle", observations: [] };
  private running = false;

  constructor(options: AgentKernelOptions = {}) {
    this.events = options.events ?? new EventBus();
    this.goals = new GoalManager(this.events);
    this.tasks = new TaskManager(this.events);
    this.memory = options.memory ?? new MemoryManager(new JsonFileMemoryStore());
    this.capabilities = new CapabilityRegistry();
    this.lifecycle = new Lifecycle(this.events);
    this.mcpClient = options.mcpClient ?? new MCPClient();
    this.ollama = options.ollamaClient ?? new OllamaClient();
    this.planner = options.planner ?? new Planner(this.ollama);

    const router = new CapabilityRouter(this.capabilities, this.mcpClient);
    const executor = new Executor(router);
    const observer = new Observer(this.events);
    const recovery = new RecoveryManager();
    const replanner = new Replanner(this.planner);
    this.controller = new ExecutionController(
      this.events,
      this.lifecycle,
      this.tasks,
      executor,
      observer,
      recovery,
      replanner,
      new Evaluator(),
    );

    this.events.on("agent.status.changed", (event) => {
      this.state.status = event.status;
    });
    this.events.on("task.updated", (event) => this.syncTask(event.taskId, event.status));
    this.events.on("task.created", (event) => {
      if (!this.state.plan) return;
      if (!this.state.plan.steps.some((step) => step.id === event.task.id)) {
        this.state.plan.steps = [...this.state.plan.steps, cloneStep(event.task)];
      }
    });
    this.events.on("observation.received", (event) => {
      this.state.observations = [...this.state.observations, cloneObservation(event.observation)];
    });
  }

  getState(): AgentState {
    return {
      ...this.state,
      ...(this.state.request ? { request: { ...this.state.request } } : {}),
      ...(this.state.plan ? { plan: clonePlan(this.state.plan) } : {}),
      ...(this.state.currentStep ? { currentStep: cloneStep(this.state.currentStep) } : {}),
      observations: this.state.observations.map(cloneObservation),
    };
  }

  setModel(model: string): void {
    this.ollama.setModel(model);
    if (this.planner instanceof Planner) this.planner.setModel(model);
  }

  getMemories() {
    return this.memory.list();
  }

  clearMemories(): Promise<void> {
    return this.memory.clear();
  }

  async run(message: string, options: RunOptions = {}): Promise<AgentResult> {
    if (this.running) {
      return { success: false, message: "AgentOS is already executing another request.", observations: [] };
    }
    const goalText = message.trim();
    if (!goalText) return { success: false, message: "Agent request cannot be empty.", observations: [] };

    this.running = true;
    const request: AgentRequest = {
      id: crypto.randomUUID(),
      message: goalText,
      createdAt: new Date().toISOString(),
    };
    const goal = this.goals.create(request.id, goalText);
    this.state = { status: this.lifecycle.getStatus(), request, observations: [] };
    let plan: ExecutionPlan | undefined;

    try {
      this.lifecycle.transition("thinking", request.id);
      this.goals.start(goal.id);

      const tools = await this.mcpClient.listTools();
      const definitions: CapabilityDefinition[] = tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema as unknown as Record<string, unknown>,
        source: "mcp",
      }));
      this.capabilities.replaceFromMcp(definitions);

      this.lifecycle.transition("planning", request.id);
      const memories = await this.memory.recall(goalText);
      plan = await this.planner.createPlan(request, this.capabilities.list(), memories, { signal: options.signal });
      this.state.plan = clonePlan(plan);

      const outcome = await this.controller.execute(
        plan,
        request,
        this.capabilities.list(),
        memories,
        options.signal,
      );
      plan = outcome.plan;
      this.state.plan = clonePlan(outcome.plan);
      this.state.observations = outcome.observations.map(cloneObservation);
      this.state.currentStep = undefined;

      if (outcome.success) {
        this.lifecycle.transition("completed", request.id);
        this.goals.complete(goal.id);
        this.events.emit({ type: "agent.completed", at: new Date().toISOString(), requestId: request.id, message: outcome.message });
      } else {
        this.lifecycle.transition("failed", request.id);
        this.goals.fail(goal.id, outcome.message);
        this.events.emit({ type: "agent.failed", at: new Date().toISOString(), requestId: request.id, error: outcome.message });
      }

      await this.recordMemory(request, outcome.success, outcome.message, outcome.plan.steps);
      return {
        success: outcome.success,
        message: outcome.message,
        requestId: request.id,
        plan: clonePlan(outcome.plan),
        observations: outcome.observations.map(cloneObservation),
      };
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : String(error);
      const status = this.lifecycle.getStatus();
      if (status !== "failed" && status !== "completed" && status !== "idle") {
        this.lifecycle.transition("failed", request.id);
      }
      const currentGoal = this.goals.get(goal.id);
      if (currentGoal && currentGoal.status !== "failed" && currentGoal.status !== "completed") {
        this.goals.fail(goal.id, messageText);
      }
      this.events.emit({ type: "agent.failed", at: new Date().toISOString(), requestId: request.id, error: messageText });
      await this.recordMemory(request, false, messageText, plan?.steps ?? []);
      return {
        success: false,
        message: messageText,
        requestId: request.id,
        ...(plan ? { plan: clonePlan(plan) } : {}),
        observations: this.state.observations.map(cloneObservation),
      };
    } finally {
      try {
        await this.mcpClient.disconnect();
      } catch (error) {
        console.error("Failed to close MCP connection:", error);
      }
      this.running = false;
    }
  }

  private syncTask(taskId: string, status: PlanStep["status"]): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    if (this.state.plan) {
      this.state.plan.steps = this.state.plan.steps.map((step) => step.id === taskId ? cloneStep(task) : step);
    }
    this.state.currentStep = status === "running" ? cloneStep(task) : undefined;
  }

  private async recordMemory(
    request: AgentRequest,
    success: boolean,
    summary: string,
    steps: PlanStep[],
  ): Promise<void> {
    try {
      const titles = steps.filter((step) => step.status === "completed").map((step) => step.title);
      const memory = await this.memory.remember({
        requestId: request.id,
        goal: request.message,
        outcome: success ? "completed" : "failed",
        summary: titles.length > 0 ? `${summary} Completed steps: ${titles.join(", ")}.` : summary,
      });
      this.events.emit({ type: "memory.recorded", at: memory.createdAt, requestId: request.id, memoryId: memory.id });
    } catch (error) {
      console.warn("Could not store AgentOS memory:", error);
    }
  }
}

function cloneStep(step: PlanStep): PlanStep {
  return {
    ...step,
    ...(step.input ? { input: { ...step.input } } : {}),
  };
}

function clonePlan(plan: ExecutionPlan): ExecutionPlan {
  return { ...plan, steps: plan.steps.map(cloneStep) };
}

function cloneObservation(observation: AgentObservation): AgentObservation {
  return { ...observation };
}
