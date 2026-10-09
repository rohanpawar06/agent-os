import { useAgentStore, useEventStore } from "@/stores";
import type { AgentEvent, Capability, ChatMessage } from "@/types";
import type { AgentTask, TaskStep, TaskStepStatus } from "@/types/task";
import { useTaskStore } from "@/stores";
import { apiFetch } from "@/lib/api";

interface AgentResponse {
  success: boolean;
  intent?: "chat" | "task";
  answer?: string;
  error?: string;
  model?: string;
  capabilities?: Array<{ name: string; description: string; capability?: string; enabled?: boolean; permission?: string; inputSchema?: Record<string, unknown> }>;
  requestId?: string;
  plan?: Array<{
    id: string;
    title: string;
    description: string;
    tool?: string;
    status: string;
    error?: string;
    targetPath?: string;
  }>;
  observations?: Array<{ stepId: string; success: boolean; error?: string; result?: string }>;
}

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function event(type: AgentEvent["type"], data?: Record<string, unknown>): AgentEvent {
  return {
    id: id("event"),
    type,
    timestamp: new Date().toISOString(),
    agentId: "agentos-core",
    data,
  };
}

let activeRequest: AbortController | undefined;

export function stopCurrentAgentRequest(): void {
  activeRequest?.abort(new DOMException("Stopped by the user.", "AbortError"));
}

export async function runAgentRequest(userInput: string): Promise<void> {
  const store = useAgentStore.getState();
  if (store.isPaused || store.isChatLoading) return;
  const eventStore = useEventStore.getState();
  const previousMessages = store.messages
    .filter((message) => message.id !== "welcome" && (message.role === "user" || message.role === "assistant"))
    .slice(-12)
    .map(({ role, content }) => ({ role, content }));

  const userMessage: ChatMessage = {
    id: id("message"),
    role: "user",
    content: userInput,
    createdAt: new Date().toISOString(),
  };

  store.addMessage(userMessage);
  store.setChatLoading(true);
  store.setAgentStatus("thinking");
  store.setRuntime({ reasoning: "active" });
  eventStore.addEvent(event("agent.thinking", { message: "Sending your request to the configured model." }));
  const controller = new AbortController();
  activeRequest = controller;

  try {
    const response = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: userInput, history: previousMessages }),
      signal: controller.signal,
    });
    const result = await response.json() as AgentResponse;
    if (!response.ok) throw new Error(result.error ?? `AgentOS returned HTTP ${response.status}.`);
    if (!result.answer) throw new Error("AgentOS returned an empty response.");

    if (result.model) {
      useAgentStore.setState((state) => ({
        agent: { ...state.agent, model: result.model },
      }));
    }

    if (result.intent === "task") {
      updateCapabilities(result.capabilities ?? []);
      store.setRuntime({
        mcp: result.capabilities?.length ? "connected" : "error",
        memory: "connected",
      });
      addPlanEvents(result.plan ?? [], eventStore.addEvent);
      recordTask(userInput, result);
    }

    const assistantMessage: ChatMessage = {
      id: id("message"),
      role: "assistant",
      content: result.answer,
      createdAt: new Date().toISOString(),
      metadata: {
        ...(result.model ? { model: result.model } : {}),
        ...(result.intent === "task" && result.plan?.length
          ? { tool: result.plan.map((step) => step.tool).filter(Boolean).join(", ") }
          : {}),
      },
    };
    store.addMessage(assistantMessage);
    store.setAgentStatus(result.success ? "completed" : "error");
    store.setRuntime({ reasoning: result.success ? "ready" : "error" });
    eventStore.addEvent(result.success
      ? event("agent.completed", { message: "The request was completed." })
      : event("agent.error", { message: result.answer }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const cancelled = controller.signal.aborted;
    const assistantMessage: ChatMessage = {
      id: id("message"),
      role: "assistant",
      content: cancelled ? "Stopped the current request." : `I couldn't complete that request: ${detail}`,
      createdAt: new Date().toISOString(),
    };
    store.addMessage(assistantMessage);
    store.setAgentStatus(cancelled ? "idle" : "error");
    store.setRuntime({ reasoning: cancelled ? "ready" : "error" });
    eventStore.addEvent(event(cancelled ? "agent.status_changed" : "agent.error", {
      message: cancelled ? "The request was stopped." : detail,
    }));
  } finally {
    if (activeRequest === controller) activeRequest = undefined;
    store.setChatLoading(false);
  }
}

function updateCapabilities(tools: Array<{ name: string; description: string; capability?: string; enabled?: boolean; permission?: string; inputSchema?: Record<string, unknown> }>): void {
  const existing = useAgentStore.getState().capabilities;
  if (existing.length >= 10) return;
  const uniqueTools = [...new Map(tools.map((tool) => [tool.name, tool])).values()];
  const grouped = new Map<string, typeof uniqueTools>();
  for (const tool of uniqueTools) {
    const group = tool.capability ?? "filesystem";
    grouped.set(group, [...(grouped.get(group) ?? []), tool]);
  }
  const labels: Record<string, string> = { filesystem: "Files & folders", documents: "Documents", spreadsheets: "Spreadsheets" };
  const capabilities: Capability[] = [...grouped.entries()].map(([id, groupTools]) => ({
    id,
    name: labels[id] ?? id,
    description: `${labels[id] ?? id} operations available to this account.`,
    status: "available",
    type: "builtin",
    tools: groupTools.map(({ name, description, inputSchema, enabled, permission }) => ({ name, description, inputSchema, enabled, permission })),
    enabledToolCount: groupTools.filter((tool) => tool.enabled !== false).length,
  }));
  useAgentStore.getState().setCapabilities(capabilities);
}

export function installCapabilities(tools: Array<{ name: string; description: string; capability?: string; enabled?: boolean; permission?: string; inputSchema?: Record<string, unknown> }>): void {
  updateCapabilities(tools);
}

function recordTask(userInput: string, result: AgentResponse): void {
  const createdAt = new Date().toISOString();
  const taskId = result.requestId ?? id("task");
  const observations = new Map((result.observations ?? []).map((observation) => [observation.stepId, observation]));
  const plan = result.plan ?? [];
  const steps: TaskStep[] = plan.map((step) => {
    const observation = observations.get(step.id);
    const status: TaskStepStatus = step.status === "retrying" ? "running" :
      ["pending", "running", "completed", "failed", "skipped"].includes(step.status)
        ? step.status as TaskStepStatus
        : "pending";
    return {
      id: step.id,
      taskId,
      title: step.title,
      description: step.description,
      type: "tool",
      status,
      ...(step.tool ? { tool: step.tool, mcpServer: "Filesystem MCP" } : {}),
      ...(observation?.result ? { result: observation.result } : {}),
      ...(step.error || observation?.error ? { error: step.error ?? observation?.error } : {}),
    };
  });
  const completed = steps.filter((step) => step.status === "completed" || step.status === "failed" || step.status === "skipped").length;
  const artifacts = plan.flatMap((step) => {
    if (step.status !== "completed") return [];
    const observation = observations.get(step.id);
    if (observation && !observation.success) return [];
    const rawPath = step.targetPath;
    if (!rawPath || !["write_file", "create_directory", "copy_path", "move_path"].includes(step.tool ?? "")) return [];
    const name = rawPath.replace(/[\\/]+$/, "").split(/[\\/]/).at(-1) ?? rawPath;
    return [{
      id: id("artifact"),
      taskId,
      name,
      type: step.tool === "create_directory" ? "folder" as const : "file" as const,
      path: rawPath,
      createdAt,
    }];
  });

  const task: AgentTask = {
    id: taskId,
    title: userInput.length > 80 ? `${userInput.slice(0, 77)}…` : userInput,
    description: userInput,
    status: result.success ? "completed" : "failed",
    priority: "normal",
    createdAt,
    ...(result.success ? { completedAt: createdAt } : {}),
    progress: steps.length ? Math.round((completed / steps.length) * 100) : result.success ? 100 : 0,
    steps,
    artifacts,
    workspace: "AgentOS workspace",
    ...(!result.success ? { error: result.answer } : {}),
  };
  useTaskStore.getState().createTask(task);
}

function addPlanEvents(
  plan: NonNullable<AgentResponse["plan"]>,
  addEvent: (event: AgentEvent) => void,
): void {
  for (const step of plan) {
    if (!step.tool) continue;
    if (step.status === "completed") {
      addEvent(event("tool.completed", { toolName: step.tool, server: "Filesystem MCP", title: step.title }));
    } else if (step.status === "failed") {
      addEvent(event("tool.failed", {
        toolName: step.tool,
        server: "Filesystem MCP",
        error: step.error ?? "The tool did not complete.",
      }));
    }
  }
}
