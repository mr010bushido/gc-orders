export interface HeartbeatStore {
  record(job: string, at: Date): Promise<void>;
  last(job: string): Promise<Date | null>;
}

// Replace this in-memory store with a database implementation when the data layer lands.
export class MemoryHeartbeatStore implements HeartbeatStore {
  private readonly times = new Map<string, Date>();

  async record(job: string, at: Date) {
    this.times.set(job, at);
  }

  async last(job: string) {
    return this.times.get(job) ?? null;
  }
}

export const heartbeatStore: HeartbeatStore = new MemoryHeartbeatStore();
