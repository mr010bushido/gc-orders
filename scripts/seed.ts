import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seedCatalogue } from "../lib/catalogue/seed.ts";

const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required");
const client = postgres(url, { prepare: false, max: 1 });
try {
  await seedCatalogue(drizzle(client));
  console.log("catalogue seeded");
} finally {
  await client.end();
}
