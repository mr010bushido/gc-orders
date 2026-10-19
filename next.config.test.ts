import { expect, it } from "vitest";
import nextConfig from "./next.config";

it("sends no-store and no-referrer on /order and every nested order route", async () => {
  const rules = await nextConfig.headers!();
  const rule = rules.find(({ source }) => source === "/order/:path*");
  expect(rule?.headers).toEqual(expect.arrayContaining([
    { key: "Cache-Control", value: "no-store" },
    { key: "Referrer-Policy", value: "no-referrer" },
  ]));
});
