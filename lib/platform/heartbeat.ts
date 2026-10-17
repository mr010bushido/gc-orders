import { eq, sql } from "drizzle-orm";
import { getDb, type Db } from "../db";
import { jobHeartbeats } from "../db/schema";

export interface HeartbeatStore {
  record(job: string, at: Date): Promise<void>;
  last(job: string): Promise<Date | null>;
}

export class DatabaseHeartbeatStore implements HeartbeatStore {
  constructor(private readonly database: () => Db = getDb) {}

  async record(job: string, at: Date) {
    await this.database().insert(jobHeartbeats).values({ job, at }).onConflictDoUpdate({
      target: jobHeartbeats.job,
      set: { at: sql`greatest(${jobHeartbeats.at}, excluded.at)` },
    });
  }

  async last(job: string) {
    const [heartbeat] = await this.database().select({ at: jobHeartbeats.at })
      .from(jobHeartbeats).where(eq(jobHeartbeats.job, job));
    return heartbeat?.at ?? null;
  }
}

export const heartbeatStore: HeartbeatStore = new DatabaseHeartbeatStore();
