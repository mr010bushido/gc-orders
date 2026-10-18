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
