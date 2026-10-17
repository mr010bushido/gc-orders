import { expect, it } from "vitest";
import { findViolations } from "./check-portability.mjs";

const file = (path: string, content: string) => [{ path, content }];

it.each(["kv", "blob", "edge-config", "postgres"])("rejects a Vercel %s import with its location", (packageName) => {
  const vendor = ["@vercel", packageName].join("/");
  expect(findViolations(file("app/example.ts", `import x from '${vendor}'`))).toEqual([
    "app/example.ts:1: Vercel storage import is forbidden",
  ]);
});

it("rejects a cron entry", () => {
  expect(findViolations(file("vercel.json", JSON.stringify({ crons: [] })))).toEqual([
    "vercel.json:1: Vercel crons are forbidden",
  ]);
});

it("rejects a Supabase import outside its adapter", () => {
  const vendor = ["@supabase", "supabase-js"].join("/");
  expect(findViolations(file("lib/booking.ts", `import x from '${vendor}'`))).toEqual([
    "lib/booking.ts:1: Supabase import outside adapter",
  ]);
});

it.each([["auth", "uid()"], ["auth", "jwt()"], ["auth", "users"], ["storage", "objects"]])(
  "rejects a %s.%s platform schema reference",
  (schema, member) => {
    expect(findViolations(file("migrations/001.sql", `select ${schema}.${member}`))).toEqual([
      "migrations/001.sql:1: platform schema reference outside adapter",
    ]);
  },
);

it("allows Supabase imports and platform schema text in its adapter", () => {
  const vendor = ["@supabase", "ssr"].join("/");
  const sql = ["auth", "uid()"].join(".");
  expect(findViolations(file("lib/platform/adapters/supabase/client.ts", `import x from '${vendor}'\n${sql}`))).toEqual([]);
});

it("accepts a clean tree", () => {
  expect(findViolations([
    { path: "app/page.tsx", content: "export default function Page() { return null }" },
    { path: "vercel.json", content: "{}" },
  ])).toEqual([]);
});
