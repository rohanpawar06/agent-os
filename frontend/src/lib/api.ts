const configuredBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "";
const base = configuredBase.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const API_KEY_STORAGE = "agentos-api-key";

export function getAgentOsApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(API_KEY_STORAGE) ?? "";
}

export function setAgentOsApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const normalized = key.trim();
  const current = window.sessionStorage.getItem(API_KEY_STORAGE) ?? "";
  if (current !== normalized) {
    for (const name of ["agentos-chat-state", "agentos-event-state", "agentos-task-state"]) {
      window.sessionStorage.removeItem(name);
    }
  }
  if (normalized) window.sessionStorage.setItem(API_KEY_STORAGE, normalized);
  else window.sessionStorage.removeItem(API_KEY_STORAGE);
}

export function getAgentOsBrowserStorage() {
  const currentStorage = () => {
    if (typeof window === "undefined") return undefined;
    return getAgentOsApiKey() ? window.sessionStorage : window.localStorage;
  };
  return {
    getItem(name: string) {
      return currentStorage()?.getItem(name) ?? null;
    },
    setItem(name: string, value: string) {
      currentStorage()?.setItem(name, value);
    },
    removeItem(name: string) {
      currentStorage()?.removeItem(name);
    },
  };
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAgentOsApiKey();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}
