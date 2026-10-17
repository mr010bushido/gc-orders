import { sql } from "drizzle-orm";
import { registerHealthCheck } from "../platform/health";
import { getDb } from "./index";

registerHealthCheck("database", async () => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database health check timed out")), 2000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
});
