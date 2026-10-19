import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LOCAL_DATABASE_URL, isComposeDevDatabaseUrl, isLocalDatabaseUrl, mergeLocalEnv, renderLocalEnv } from "./dev-env.ts";

describe("isLocalDatabaseUrl", () => {
  it.each([
    "postgres://cakes:pw@localhost:5435/cakes",
    "postgres://cakes:pw@127.0.0.1:5435/cakes",
    "postgres://cakes:pw@[::1]:5435/cakes",
    "postgresql://cakes@LOCALHOST/cakes",
    LOCAL_DATABASE_URL,
  ])("accepts %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(true));

  it.each([
    undefined,
    "",
    "not a url",
    "localhost",
    "postgres://",
    "postgres://cakes:pw@db.example.supabase.co:5432/postgres",
    "postgres://cakes:pw@10.0.0.5:5432/cakes",
    "postgres://cakes:pw@localhost.evil.com:5432/cakes",
    "postgres://cakes:pw@evil-localhost:5432/cakes",
    "postgres://cakes:pw@127.0.0.1.evil.com/cakes",
    "postgres://localhost:5432@evil.com/cakes",
    "postgres://localhost@evil.com/cakes",
    "postgres://cakes:pw@localhost./cakes",
    "postgres://cakes:pw@[::2]/cakes",
    "postgres://cakes:pw@localhost/cakes?host=evil.com",
    "postgres://cakes:pw@localhost/cakes?hostaddr=10.0.0.5",
    "postgres://cakes:pw@localhost,evil.com/cakes",
  ])("rejects %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(false));
});

describe("isComposeDevDatabaseUrl", () => {
  it.each([
    "postgres://cakes:pw@127.0.0.1:5435/cakes",
    "postgres://cakes:pw@localhost:5435/cakes",
    "postgres://cakes:pw@[::1]:5435/cakes",
    LOCAL_DATABASE_URL,
  ])("accepts %s", (url) => expect(isComposeDevDatabaseUrl(url)).toBe(true));

  it.each([
    undefined,
    "",
    "garbage",
    "postgres://cakes:pw@127.0.0.1:5432/cakes",
    "postgres://cakes:pw@127.0.0.1/cakes",
    "postgres://cakes:pw@localhost/cakes",
    "postgres://cakes:pw@127.0.0.1:5433/cakes",
    "postgres://cakes:pw@127.0.0.1:5434/cakes",
    "postgres://cakes:pw@127.0.0.1:5436/cakes_test",
    "postgres://cakes:pw@127.0.0.1:5436/cakes",
    "postgres://cakes:pw@127.0.0.1:5435/cakes_test",
    "postgres://cakes:pw@127.0.0.1:5435/postgres",
    "postgres://cakes:pw@127.0.0.1:5435",
    "postgres://cakes:pw@127.0.0.1:5435/cakes/extra",
    "postgres://cakes:pw@db.example.supabase.co:5435/cakes",
    "postgres://cakes:pw@localhost.evil.com:5435/cakes",
    "postgres://localhost:5435@evil.com/cakes",
    "postgres://cakes:pw@localhost:5435/cakes?host=evil.com",
    "postgres://cakes:pw@127.0.0.1:5435/cakes?hostaddr=10.0.0.5",
    "postgres://cakes:pw@127.0.0.1:5435/cakes?port=5432",
    "postgres://cakes:pw@127.0.0.1:5435/cakes?database=other",
  ])("rejects %s", (url) => expect(isComposeDevDatabaseUrl(url)).toBe(false));
});

describe("renderLocalEnv and mergeLocalEnv", () => {
  const secret = randomBytes(8).toString("hex");

  it("renders the local defaults with the supplied secret", () => {
    const env = renderLocalEnv(secret);
    expect(env).toContain(`DATABASE_URL=${LOCAL_DATABASE_URL}\n`);
    expect(env).toContain(`DATABASE_MIGRATION_URL=${LOCAL_DATABASE_URL}\n`);
    expect(env).toContain("APP_URL=http://localhost:3000\n");
    expect(env).toContain(`JOBS_SECRET=${secret}\n`);
  });

  it("leaves a complete file byte-for-byte unchanged", () => {
    const complete = renderLocalEnv(secret);
    expect(mergeLocalEnv(complete, "other")).toBe(complete);
  });

  it("never overwrites existing keys, even empty or differently valued ones", () => {
    const existing = "DATABASE_URL=postgres://u:p@elsewhere/db\nexport JOBS_SECRET=\n# APP_URL=commented\n";
    const merged = mergeLocalEnv(existing, secret);
    expect(merged.startsWith(existing)).toBe(true);
    expect(merged).toContain("DATABASE_URL=postgres://u:p@elsewhere/db\n");
    expect(merged.match(/DATABASE_URL=/g)).toHaveLength(1);
    expect(merged.match(/JOBS_SECRET=/g)).toHaveLength(1);
    expect(merged).toContain(`DATABASE_MIGRATION_URL=${LOCAL_DATABASE_URL}\n`);
    expect(merged).toContain("\nAPP_URL=http://localhost:3000\n");
  });

  it("starts appended keys on a new line when the file has no trailing newline", () => {
    expect(mergeLocalEnv("FOO=bar", secret).startsWith("FOO=bar\nDATABASE_URL=")).toBe(true);
  });
});
