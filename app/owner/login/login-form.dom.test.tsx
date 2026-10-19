import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { LINK_ERROR_MESSAGE, LoginForm, NOT_CONFIGURED_MESSAGE, SENT_MESSAGE } from "./login-form";

const sendOwnerLoginLink = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ sendOwnerLoginLink }));

beforeEach(() => sendOwnerLoginLink.mockReset());

async function submit(email = "someone@example.com") {
  await userEvent.type(screen.getByLabelText("Email address"), email);
  fireEvent.click(screen.getByRole("button", { name: "Send me a link" }));
}

it("starts with a labelled email field and one primary button", () => {
  render(<LoginForm configured linkError={false} />);
  const field = screen.getByLabelText("Email address") as HTMLInputElement;
  expect(field.type).toBe("email");
  expect(field.required).toBe(true);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows the generic confirmation and moves focus to it after sending", async () => {
  sendOwnerLoginLink.mockResolvedValue({ state: "sent" });
  render(<LoginForm configured linkError={false} />);
  await submit();
  const status = await screen.findByRole("status");
  expect(status.textContent).toBe(SENT_MESSAGE);
  await waitFor(() => expect(document.activeElement).toBe(status));
  expect(screen.queryByLabelText("Email address")).toBeNull();
  expect(screen.getByRole("link", { name: "Back to sign in" }).getAttribute("href")).toBe("/owner/login");
});

it("answers a rate-limited request with the same words as a sent one", async () => {
  sendOwnerLoginLink.mockResolvedValue({ state: "rate-limited" });
  render(<LoginForm configured linkError={false} />);
  await submit();
  expect((await screen.findByRole("status")).textContent).toBe(SENT_MESSAGE);
});

it("announces an invalid link, focuses the alert and keeps the form for a new request", async () => {
  render(<LoginForm configured linkError />);
  const alert = screen.getByRole("alert");
  expect(alert.textContent).toBe(LINK_ERROR_MESSAGE);
  await waitFor(() => expect(document.activeElement).toBe(alert));
  expect(screen.getByLabelText("Email address")).toBeTruthy();
});

it("says plainly when owner login is not configured and offers no form", async () => {
  render(<LoginForm configured={false} linkError={false} />);
  const alert = screen.getByRole("alert");
  expect(alert.textContent).toBe(NOT_CONFIGURED_MESSAGE);
  await waitFor(() => expect(document.activeElement).toBe(alert));
  expect(screen.queryByLabelText("Email address")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

it("shows the not-configured notice when the server reports it", async () => {
  sendOwnerLoginLink.mockResolvedValue({ state: "not-configured" });
  render(<LoginForm configured linkError={false} />);
  await submit();
  expect((await screen.findByRole("alert")).textContent).toBe(NOT_CONFIGURED_MESSAGE);
});

it.each([
  ["initial", { configured: true, linkError: false }],
  ["link error", { configured: true, linkError: true }],
  ["not configured", { configured: false, linkError: false }],
])("has no accessibility violations in the %s state", async (_name, props) => {
  const { container } = render(<main><LoginForm {...props} /></main>);
  // jsdom cannot compute colour, so contrast comes from the tokens.
  const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
});
