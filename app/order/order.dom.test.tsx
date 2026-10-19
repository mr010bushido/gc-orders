import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PopForm } from "./pop-form";
import { FindBookingForm } from "./find-form";
import { StatusMessage } from "./status-message";

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
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(field.nextElementSibling).toBe(screen.getByRole("alert"));
});

it("keeps the pasted SMS after a server error", async () => {
  mocks.submit.mockResolvedValue({ ok: false, error: "We couldn't submit those payment details. Try again." });
  render(<PopForm token="private-token" />);
  const field = screen.getByLabelText("Paste the full mobile money confirmation SMS") as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: "Airtel K520 sent, TID 123" } });
  fireEvent.submit(field.closest("form")!);
  await screen.findByRole("alert");
  await waitFor(() => expect(document.activeElement).toBe(field));
  expect(field.value).toBe("Airtel K520 sent, TID 123");
  expect(mocks.submit).toHaveBeenCalledOnce();
});

it("moves focus to the status message when the server says the page is stale", async () => {
  mocks.submit.mockResolvedValue({ ok: false, stale: true, error: "This booking has expired. Please book again to choose a new date." });
  render(<><StatusMessage status="awaiting_payment" /><PopForm token="private-token" /></>);
  const field = screen.getByLabelText("Paste the full mobile money confirmation SMS");
  fireEvent.change(field, { target: { value: "valid confirmation" } });
  fireEvent.submit(field.closest("form")!);
  await waitFor(() => expect(document.activeElement?.id).toBe("order-status"));
});

it("moves focus to the status message after a successful send", async () => {
  mocks.submit.mockResolvedValue({ ok: true, status: "awaiting_verification" });
  render(<><StatusMessage status="awaiting_payment" /><PopForm token="private-token" /></>);
  const field = screen.getByLabelText("Paste the full mobile money confirmation SMS");
  fireEvent.change(field, { target: { value: "valid confirmation" } });
  fireEvent.submit(field.closest("form")!);
  await screen.findByText(/Payment details received/);
  await waitFor(() => expect(document.activeElement?.id).toBe("order-status"));
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

it("ties a refused lookup to the reference field", async () => {
  mocks.find.mockResolvedValue({ ok: false, error: "Too many attempts. Please try again later." });
  render(<FindBookingForm />);
  const reference = screen.getByLabelText("Booking reference");
  fireEvent.change(reference, { target: { value: "CAKE-2026-0001" } });
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "0977 123 456" } });
  fireEvent.submit(reference.closest("form")!);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Too many attempts");
  expect(reference.getAttribute("aria-invalid")).toBe("true");
  expect(reference.getAttribute("aria-describedby")).toBe(alert.id);
});
