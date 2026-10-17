import { migrate } from "drizzle-orm/pglite/migrator";
import { expect, it } from "vitest";
import { createTestDb } from "./test-db";

it("applying migrations twice preserves schema, migration history, and existing data", async () => {
  const test = await createTestDb();
  try {
    await test.client.exec("create temporary table sentinel (value text); insert into sentinel values ('keep')");
    const history = await test.client.query("select * from drizzle.__drizzle_migrations order by id");
    const columns = await test.client.query("select * from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position");
    await migrate(test.db, { migrationsFolder: "./drizzle" });
    expect(await test.client.query("select * from drizzle.__drizzle_migrations order by id")).toEqual(history);
    expect(await test.client.query("select * from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position")).toEqual(columns);
    expect((await test.client.query("select * from sentinel")).rows).toEqual([{ value: "keep" }]);
  } finally {
    await test.close();
  }
});
