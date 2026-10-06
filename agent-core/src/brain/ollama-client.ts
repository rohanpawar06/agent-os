export interface OllamaMessage {
  role: "system" | "user";
  content: string;
}

interface OllamaChatResponse {
  message?: { role?: string; content?: unknown };
}

export class OllamaClient {
  readonly baseUrl: string;
  readonly model: string;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    model = process.env.OLLAMA_MODEL ?? "qwen2.5",
    private readonly timeoutMs = parsePositiveInteger(process.env.AGENTOS_LLM_TIMEOUT_MS, 120_000),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
    if (!this.model.trim()) throw new Error("OLLAMA_MODEL cannot be empty.");
  }

  async chatJson(messages: OllamaMessage[], signal?: AbortSignal): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`Ollama request timed out after ${this.timeoutMs} ms.`)), this.timeoutMs);
    const abortFromCaller = () => controller.abort(signal?.reason);
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ model: this.model, messages, format: "json", stream: false }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`Ollama returned HTTP ${response.status}${detail ? `: ${detail}` : ""}.`);
      }
      const result = await response.json() as OllamaChatResponse;
      if (typeof result.message?.content !== "string") {
        throw new Error("Ollama returned a response without message.content.");
      }
      return result.message.content;
    } catch (error) {
      if (controller.signal.aborted) {
        if (signal?.aborted) throw signal.reason ?? new Error("Agent request was cancelled.");
        throw new Error(`Ollama request timed out after ${this.timeoutMs} ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
