import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    return { db, client, close: () => client.close() };
  } catch (error) {
    await client.close();
    throw error;
  }
}
