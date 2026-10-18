import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PopForm } from "./pop-form";
import { FindBookingForm } from "./find-form";

const mocks = vi.hoisted(() => ({ submit: vi.fn(), find: vi.fn() }));
vi.mock("./pop-action", () => ({ submitPopAction: (...args: unknown[]) => mocks.submit(...args) }));
vi.mock("./actions", () => ({ findMyBookingAction: (...args: unknown[]) => mocks.find(...args) }));

afterEach(() => { vi.clearAllMocks(); });

it("associates POP server errors with the field, alerts and focuses it", async () => {
  mocks.submit.mockResolvedValue({ ok: false, error: "Paste the full confirmation SMS." });
  render(<PopForm token="private-token" />);
  const field = screen.getByLabelText("Paste the full mobile money confirmation SMS");
  fireEvent.change(field, { target: { value: "valid confirmation" } });
  fireEvent.submit(field.closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toContain("Paste the full confirmation SMS.");
  await waitFor(() => expect(document.activeElement).toBe(field));
  expect(field.getAttribute("aria-describedby")).toBe("pop-error");
});

it("announces POP success in a live region", async () => {
  mocks.submit.mockResolvedValue({ ok: true, status: "awaiting_verification" });
  render(<PopForm token="private-token" />);
  fireEvent.change(screen.getByLabelText("Paste the full mobile money confirmation SMS"), { target: { value: "valid confirmation" } });
  fireEvent.submit(screen.getByLabelText("Paste the full mobile money confirmation SMS").closest("form")!);
  expect((await screen.findByRole("status")).getAttribute("aria-live")).toBe("polite");
});

it("shows the same find-booking response after a lookup", async () => {
  mocks.find.mockResolvedValue({ ok: true, message: "If that booking exists, we've sent a link." });
  render(<FindBookingForm />);
  fireEvent.change(screen.getByLabelText("Booking reference"), { target: { value: "CAKE-2026-0001" } });
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "0977 123 456" } });
  fireEvent.submit(screen.getByRole("button", { name: "Send my order link" }).closest("form")!);
  expect((await screen.findByRole("status")).textContent).toContain("If that booking exists, we've sent a link.");
});
