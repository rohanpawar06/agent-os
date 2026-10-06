export type MemoryOutcome = "completed" | "failed";

export interface MemoryRecord {
  id: string;
  requestId: string;
  goal: string;
  outcome: MemoryOutcome;
  summary: string;
  createdAt: string;
}

export interface MemoryStore {
  list(): Promise<MemoryRecord[]>;
  append(record: MemoryRecord): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryMemoryStore implements MemoryStore {
  private records: MemoryRecord[] = [];

  constructor(private readonly capacity = 500) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("Memory capacity must be a positive integer.");
  }

  async list(): Promise<MemoryRecord[]> {
    return this.records.map((record) => ({ ...record }));
  }

  async append(record: MemoryRecord): Promise<void> {
    this.records.push({ ...record });
    if (this.records.length > this.capacity) this.records.splice(0, this.records.length - this.capacity);
  }

  async clear(): Promise<void> {
    this.records = [];
  }
}

export class MemoryManager {
  constructor(private readonly store: MemoryStore = new InMemoryMemoryStore()) {}

  async remember(record: Omit<MemoryRecord, "id" | "createdAt">): Promise<MemoryRecord> {
    const stored: MemoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.store.append(stored);
    return { ...stored };
  }

  async recall(query: string, limit = 5): Promise<MemoryRecord[]> {
    if (!Number.isInteger(limit) || limit < 1) return [];
    const terms = new Set(query.toLowerCase().match(/[a-z0-9_-]{3,}/g) ?? []);
    const records = await this.store.list();
    return records
      .map((record, index) => {
        const text = `${record.goal} ${record.summary}`.toLowerCase();
        const score = [...terms].reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
        return { record, score, index };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || right.index - left.index)
      .slice(0, limit)
      .map(({ record }) => ({ ...record }));
  }

  async list(): Promise<MemoryRecord[]> {
    return this.store.list();
  }
}
