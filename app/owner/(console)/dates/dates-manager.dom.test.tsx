import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatesManager } from "./dates-manager";
import { blockDate, closeSuggestedDate, keepDateOpen, reopenDate } from "./actions";

vi.mock("./actions", () => ({
  blockDate: vi.fn(), closeSuggestedDate: vi.fn(), keepDateOpen: vi.fn(), reopenDate: vi.fn(),
}));

const date = "2026-11-14";
const props = {
  today: "2026-10-18",
  suggestions: [{ date, confirmedCount: 10, capacity: 10, awaitingCount: 3 }],
  closedDates: [{ date: "2026-12-25", reason: "manual" as const, note: "Christmas" }],
};

beforeEach(() => vi.clearAllMocks());

describe("DatesManager", () => {
  it("shows capacity details, closed reasons, date links and the sans date picker", () => {
    render(<DatesManager {...props} />);
    expect(screen.getByText("10 confirmed, 3 awaiting · capacity 10")).toBeTruthy();
    expect(screen.getByText("Manual block · Christmas")).toBeTruthy();
    expect(screen.getByRole("link", { name: "14 Nov 2026" }).getAttribute("href")).toBe("/owner/orders?date=2026-11-14");
    expect(screen.getByRole("link", { name: "25 Dec 2026" }).getAttribute("href")).toBe("/owner/orders?date=2026-12-25");
    expect(screen.getByText("October 2026").className).toContain("font-sans");
    expect(screen.getByText("October 2026").className).not.toContain("font-display");
  });

  it("shows empty states for both lists", () => {
    render(<DatesManager today={props.today} suggestions={[]} closedDates={[]} />);
    expect(screen.getByText("No dates have reached capacity.")).toBeTruthy();
    expect(screen.getByText("No dates are closed.")).toBeTruthy();
  });

  it("runs close and keep-open actions for the selected suggestion", async () => {
    vi.mocked(closeSuggestedDate).mockResolvedValue({ ok: true });
    vi.mocked(keepDateOpen).mockResolvedValue({ ok: true });
    render(<DatesManager {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Close date" }));
    expect(closeSuggestedDate).toHaveBeenCalledWith(date);
    await userEvent.click(screen.getByRole("button", { name: "Keep open" }));
    expect(keepDateOpen).toHaveBeenCalledWith(date);
  });

  it("blocks a selected date and reports that existing orders stay as they are", async () => {
    vi.mocked(blockDate).mockResolvedValue({ ok: true, existingOrderCount: 4 });
    render(<DatesManager today={props.today} suggestions={[]} closedDates={[]} />);
    await userEvent.click(document.querySelector<HTMLButtonElement>('[data-date="2026-10-20"]')!);
    await userEvent.type(screen.getByLabelText("Note (optional)"), "Power cut");
    await userEvent.click(screen.getByRole("button", { name: "Block date" }));
    expect(blockDate).toHaveBeenCalledWith("2026-10-20", "Power cut");
    expect(await screen.findByText("Date blocked. 4 existing orders stay as they are.")).toBeTruthy();
  });

  it("reopens a closed date", async () => {
    vi.mocked(reopenDate).mockResolvedValue({ ok: true });
    render(<DatesManager {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(reopenDate).toHaveBeenCalledWith("2026-12-25");
  });
});
