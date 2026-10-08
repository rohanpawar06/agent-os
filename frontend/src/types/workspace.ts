export type WorkspaceView =
  | "overview"
  | "agent"
  | "projects"
  | "tasks"
  | "memory"
  | "capabilities"
  | "tools"
  | "security"
  | "settings";

export const workspaceViewLabels: Record<WorkspaceView, string> = {
  overview: "Overview",
  agent: "Agent",
  projects: "Projects",
  tasks: "Tasks",
  memory: "Memory",
  capabilities: "Capabilities",
  tools: "Tools",
  security: "Security",
  settings: "Settings",
};
