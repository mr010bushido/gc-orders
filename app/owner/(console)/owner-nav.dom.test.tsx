import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { OwnerNav } from "./owner-nav";

const pathname = vi.hoisted(() => ({ value: "/owner/dates" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

beforeEach(() => { pathname.value = "/owner/dates"; });

it("includes Dates and marks the current owner route", () => {
  render(<OwnerNav />);
  expect(screen.getByRole("link", { name: "Dates" }).getAttribute("href")).toBe("/owner/dates");
  expect(screen.getByRole("link", { name: "Dates" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Orders" }).getAttribute("aria-current")).toBeNull();
});
