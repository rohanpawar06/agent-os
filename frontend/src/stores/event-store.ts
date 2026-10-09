"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AgentEvent } from "@/types";
import { getAgentOsBrowserStorage } from "@/lib/api";

interface EventStore {
  events: AgentEvent[];

  addEvent: (
    event: AgentEvent,
  ) => void;

  addEvents: (
    events: AgentEvent[],
  ) => void;

  clearEvents: () => void;

  getRecentEvents: (
    limit?: number,
  ) => AgentEvent[];
}

export const useEventStore =
  create<EventStore>()(persist((set, get) => ({
    events: [],

    addEvent: (event) =>
      set((state) => ({
        events: [
          event,
          ...state.events,
        ],
      })),

    addEvents: (events) =>
      set((state) => ({
        events: [
          ...events,
          ...state.events,
        ],
      })),

    clearEvents: () =>
      set({
        events: [],
      }),

    getRecentEvents: (limit = 20) =>
      get().events.slice(0, limit),
  }), {
    name: "agentos-event-state",
    storage: createJSONStorage(() => getAgentOsBrowserStorage()),
    partialize: (state) => ({ events: state.events.slice(0, 100) }),
    skipHydration: true,
  }));
