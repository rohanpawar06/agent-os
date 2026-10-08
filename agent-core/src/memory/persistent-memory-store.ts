import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { MemoryRecord, MemoryStore } from "./memory-manager.js";

/** Stores local AgentOS outcomes so memory survives server restarts. */
export class JsonFileMemoryStore implements MemoryStore {
  private readonly filePath = process.env.AGENTOS_MEMORY_PATH ?? path.join(
    process.env.AGENTOS_DATA_DIR ?? path.join(os.homedir(), ".agentos"),
    "memory.json",
  );

  private queue: Promise<unknown> = Promise.resolve();

  list(): Promise<MemoryRecord[]> {
    return this.serialize(() => this.read());
  }

  append(record: MemoryRecord): Promise<void> {
    return this.serialize(async () => {
      const records = await this.read();
      records.push({ ...record });
      if (records.length > 500) records.splice(0, records.length - 500);
      await this.write(records);
    });
  }

  clear(): Promise<void> {
    return this.serialize(async () => {
      await fs.rm(this.filePath, { force: true });
    });
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  private async read(): Promise<MemoryRecord[]> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const records: unknown = JSON.parse(content);
      if (!Array.isArray(records) || !records.every(isMemoryRecord)) {
        throw new Error(`AgentOS memory file is invalid: ${this.filePath}`);
      }
      return records;
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
  }

  private async write(records: MemoryRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(records, null, 2), "utf8");
    try {
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true });
      throw error;
    }
  }
}

function isMemoryRecord(value: unknown): value is MemoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.requestId === "string" &&
    typeof record.goal === "string" &&
    (record.outcome === "completed" || record.outcome === "failed") &&
    typeof record.summary === "string" &&
    typeof record.createdAt === "string";
}

function isMissingFile(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
