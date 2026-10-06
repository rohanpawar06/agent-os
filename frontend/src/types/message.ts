export type MessageRole =
  | "user"
  | "assistant"
  | "system"
  | "tool";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;

  metadata?: {
    model?: string;
    tool?: string;
    taskId?: string;
  };
}