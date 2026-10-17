import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it.each([undefined, "", "postgres://test:test@localhost/migration"])("selects the migration URL with runtime fallback for %s", async (migrationUrl) => {
  vi.resetModules();
  vi.stubEnv("DATABASE_MIGRATION_URL", migrationUrl);
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/runtime");
  const { default: config } = await import("./drizzle.config");
  expect(config).toMatchObject({ dbCredentials: { url: migrationUrl || process.env.DATABASE_URL } });
});

it("can load migration configuration without a database", async () => {
  vi.resetModules();
  vi.stubEnv("DATABASE_MIGRATION_URL", undefined);
  vi.stubEnv("DATABASE_URL", undefined);
  const { default: config } = await import("./drizzle.config");
  expect(config).toMatchObject({ dbCredentials: { url: "" } });
});
