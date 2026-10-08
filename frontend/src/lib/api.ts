const configuredBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "http://127.0.0.1:8080";
const base = configuredBase.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
