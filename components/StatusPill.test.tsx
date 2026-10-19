import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill, type OrderStatus } from "./StatusPill";

describe("StatusPill", () => {
  const labels: Record<OrderStatus, string> = {
    new: "New", awaiting_quote: "Awaiting quote", awaiting_payment: "Awaiting payment",
    awaiting_verification: "Awaiting verification", confirmed: "Confirmed", completed: "Completed", expired: "Expired",
  };
  it.each(Object.entries(labels))("renders %s with its agreed label", (status, label) => {
    render(<StatusPill status={status as OrderStatus} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
