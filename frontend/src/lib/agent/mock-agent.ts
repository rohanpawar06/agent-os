"use client";

import {
  useAgentStore,
} from "@/stores";

import {
  useEventStore,
} from "@/stores";

import type {
  Activity,
  AgentEvent,
  ChatMessage,
} from "@/types";

function sleep(
  milliseconds: number,
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

function createId(
  prefix: string,
) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

function createEvent<T>(
  type: AgentEvent["type"],
  data?: T,
): AgentEvent<T> {
  return {
    id: createId("event"),
    type,
    timestamp:
      new Date().toISOString(),
    agentId: "agentos-core",
    data,
  };
}

export async function runMockAgent(
  userInput: string,
) {
  const agentStore =
    useAgentStore.getState();

  const eventStore =
    useEventStore.getState();

  // -----------------------------
  // User message
  // -----------------------------

  const userMessage: ChatMessage = {
    id: createId("message"),
    role: "user",
    content: userInput,
    createdAt:
      new Date().toISOString(),
  };

  agentStore.addMessage(
    userMessage,
  );

  // -----------------------------
  // Agent thinking
  // -----------------------------

  agentStore.setChatLoading(
    true,
  );

  agentStore.setAgentStatus(
    "thinking",
  );

  agentStore.setRuntime({
    reasoning: "active",
  });

  eventStore.addEvent(
    createEvent(
      "agent.thinking",
      {
        message:
          "Analyzing your request...",
      },
    ),
  );

  await sleep(900);

  // -----------------------------
  // Planning
  // -----------------------------

  agentStore.setAgentStatus(
    "planning",
  );

  eventStore.addEvent(
    createEvent(
      "agent.status_changed",
      {
        status: "planning",
        message:
          "Creating an execution plan.",
      },
    ),
  );

  await sleep(900);

  // -----------------------------
  // Tool execution
  // -----------------------------

  const activityId =
    createId("activity");

  const activity: Activity = {
    id: activityId,
    type: "tool",
    title:
      "Filesystem MCP",
    description:
      "Agent is checking available workspace capabilities.",
    status: "running",
    createdAt:
      new Date().toISOString(),
    toolName:
      "create_directory",
    mcpServer:
      "Filesystem MCP",
  };

  agentStore.addActivity(
    activity,
  );

  agentStore.setAgentStatus(
    "executing",
  );

  agentStore.setRuntime({
    mcp: "connected",
  });

  eventStore.addEvent(
    createEvent(
      "tool.started",
      {
        toolName:
          "create_directory",
        server:
          "Filesystem MCP",
      },
    ),
  );

  await sleep(1200);

  agentStore.updateActivity(
    activityId,
    {
      status: "success",
      description:
        "Tool execution completed successfully.",
    },
  );

  eventStore.addEvent(
    createEvent(
      "tool.completed",
      {
        toolName:
          "create_directory",
        server:
          "Filesystem MCP",
      },
    ),
  );

  // -----------------------------
  // Agent response
  // -----------------------------

  await sleep(700);

  const responseMessage: ChatMessage =
    {
      id: createId("message"),
      role: "assistant",
      content:
        "I analyzed your request and successfully used the connected Filesystem MCP capability. The agent runtime is ready to continue with multi-step tasks.",
      createdAt:
        new Date().toISOString(),
      metadata: {
        tool:
          "create_directory",
      },
    };

  agentStore.addMessage(
    responseMessage,
  );

  // -----------------------------
  // Completed
  // -----------------------------

  agentStore.setAgentStatus(
    "completed",
  );

  agentStore.setRuntime({
    reasoning: "ready",
  });

  eventStore.addEvent(
    createEvent(
      "agent.completed",
    ),
  );

  agentStore.setChatLoading(
    false,
  );

  // Return to idle
  await sleep(500);

  agentStore.setAgentStatus(
    "idle",
  );
}