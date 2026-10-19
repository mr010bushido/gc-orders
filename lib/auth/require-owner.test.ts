import { describe, expect, it } from "vitest";
import { makeOwnerAuthFake } from "../platform/fakes";
import { ownerForRequest } from "./require-owner";

describe("ownerForRequest", () => {
  it("accepts the configured owner case-insensitively", async () => {
    const { auth, issuedLinks, headers } = makeOwnerAuthFake();
    await auth.sendMagicLink("Owner@Example.com", "");
    await auth.completeLogin(issuedLinks[0]);
    headers.set("authorization", `Bearer ${issuedLinks[0].get("token")}`);
    await expect(ownerForRequest(auth, headers, "owner@example.com")).resolves.toMatchObject({ email: "Owner@Example.com" });
  });

  it("treats another valid user as signed out", async () => {
    const { auth, issuedLinks, headers } = makeOwnerAuthFake();
    await auth.sendMagicLink("stranger@example.com", "");
    await auth.completeLogin(issuedLinks[0]);
    headers.set("authorization", `Bearer ${issuedLinks[0].get("token")}`);
    await expect(ownerForRequest(auth, headers, "owner@example.com")).resolves.toBeNull();
  });

  it("fails closed with no session or owner configuration", async () => {
    const { auth, headers } = makeOwnerAuthFake();
    await expect(ownerForRequest(auth, headers, "owner@example.com")).resolves.toBeNull();
    await expect(ownerForRequest(auth, headers, undefined)).resolves.toBeNull();
  });
});
