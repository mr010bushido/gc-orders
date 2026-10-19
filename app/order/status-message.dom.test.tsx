import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StatusMessage } from "./status-message";

it.each([
  ["awaiting_quote", "reviewing your request"],
  ["awaiting_payment", "pay the deposit"],
  ["awaiting_verification", "verification"],
  ["confirmed", "confirmed"],
  ["completed", "complete"],
  ["expired", "expired"],
] as const)("shows clear copy for %s", (status, phrase) => {
  render(<StatusMessage status={status} />);
  expect(screen.getByText(new RegExp(phrase, "i"))).toBeTruthy();
});

it("explains flagged verification", () => {
  render(<StatusMessage status="awaiting_verification" flagged />);
  expect(screen.getByText(/needs a little more information/i)).toBeTruthy();
});

it("announces the status message after a page refresh", () => {
  const { rerender } = render(<StatusMessage status="awaiting_payment" />);
  const announcement = screen.getByRole("status");
  expect(announcement.getAttribute("aria-live")).toBe("polite");
  rerender(<StatusMessage status="awaiting_verification" />);
  expect(announcement.textContent).toContain("owner for verification");
});

it("says the owner has the updated details once a flagged order is answered", () => {
  render(<StatusMessage status="awaiting_verification" flagged received />);
  expect(screen.getByText(/received your updated details/i)).toBeTruthy();
  expect(screen.queryByText(/needs a little more information/i)).toBeNull();
});

it("links an expired booking to the booking page", () => {
  render(<StatusMessage status="expired" />);
  expect(screen.getByRole("link", { name: "Book again" }).getAttribute("href")).toBe("/book");
});
