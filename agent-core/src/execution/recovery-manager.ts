import type { AgentObservation } from "../agent/types.js";

const TRANSIENT_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|transport.*closed|connection.*closed|temporar|fetch failed|timed? ?out/i;

export class RecoveryManager {
  private readonly maxAttempts = parseNonNegativeInteger(process.env.AGENTOS_MAX_TASK_RETRIES, 1) + 1;
  private readonly baseDelayMs = parseNonNegativeInteger(process.env.AGENTOS_RETRY_DELAY_MS, 250);

  shouldRetry(observation: AgentObservation): boolean {
    const attempts = observation.attempt ?? 1;
    return !observation.success && attempts < this.maxAttempts && TRANSIENT_ERROR.test(observation.error ?? "");
  }

  async waitBeforeRetry(attempt: number, signal?: AbortSignal): Promise<void> {
    const delay = Math.min(this.baseDelayMs * 2 ** Math.max(0, attempt - 1), 5_000);
    if (delay === 0) return;
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason ?? new Error("Agent request was cancelled."));
        return;
      }
      const timer = setTimeout(done, delay);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(signal?.reason ?? new Error("Agent request was cancelled."));
      };
      function done() {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

function parseNonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
