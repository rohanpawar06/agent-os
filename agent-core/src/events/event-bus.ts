import type { AgentEvent, AgentEventOf, AgentEventType } from "./event-types.js";

export type EventListener<T extends AgentEventType> = (event: AgentEventOf<T>) => void;

export class EventBus {
  private readonly listeners = new Map<AgentEventType, Set<(event: AgentEvent) => void>>();

  on<T extends AgentEventType>(type: T, listener: EventListener<T>): () => void {
    const bucket = this.listeners.get(type) ?? new Set<(event: AgentEvent) => void>();
    const wrapped = listener as (event: AgentEvent) => void;
    bucket.add(wrapped);
    this.listeners.set(type, bucket);
    return () => {
      bucket.delete(wrapped);
      if (bucket.size === 0) this.listeners.delete(type);
    };
  }

  emit(event: AgentEvent): void {
    const bucket = this.listeners.get(event.type);
    if (!bucket) return;
    for (const listener of [...bucket]) {
      try {
        listener(event);
      } catch (error) {
        // A UI or logging subscriber must not interrupt the agent's execution.
        console.error("AgentOS event listener failed:", error);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
