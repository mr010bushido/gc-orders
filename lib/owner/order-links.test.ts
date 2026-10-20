import { describe, expect, it } from "vitest";
import { ownerContactLinks } from "./order-links";

describe("ownerContactLinks", () => {
  it("normalises Zambian numbers and encodes the prefilled reference", () => {
    expect(ownerContactLinks("0977 123 456", "CAKE-2026-0042")).toEqual({
      tel: "tel:+260977123456",
      whatsapp: "https://wa.me/260977123456?text=Hello%2C%20regarding%20CAKE-2026-0042.",
    });
  });
  it("refuses invalid numbers", () => expect(ownerContactLinks("javascript:alert(1)", "x")).toBeNull());
  it("encodes an untrusted reference as text", () => expect(ownerContactLinks("+260977123456", "x&text=oops")?.whatsapp).toContain("x%26text%3Doops"));
});
