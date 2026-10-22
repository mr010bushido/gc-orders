import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { defaultCatalogue } from "../../../../lib/catalogue/catalogue";
import { SettingsManager } from "./settings-manager";

const actions = vi.hoisted(() => ({ manageCatalogueItem: vi.fn(), saveFeesAndRules: vi.fn(), savePaymentAndContact: vi.fn(), savePrices: vi.fn(), saveTimeWindows: vi.fn() }));
vi.mock("./actions", () => ({ ...actions }));

beforeEach(() => {
  actions.manageCatalogueItem.mockReset().mockResolvedValue({ ok: true });
  actions.saveFeesAndRules.mockReset().mockResolvedValue({ ok: true });
  actions.savePaymentAndContact.mockReset().mockResolvedValue({ ok: true });
  actions.savePrices.mockReset().mockResolvedValue({ ok: true });
  actions.saveTimeWindows.mockReset().mockResolvedValue({ ok: true });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

it("shows field errors, saves the configured sections and compares old and new prices", async () => {
  actions.saveFeesAndRules.mockResolvedValue({ ok: false, errors: { max_tiers: { code: "OUT_OF_RANGE", message: "max_tiers must be a whole number from 1 to 5" } } });
  render(<SettingsManager catalogue={defaultCatalogue()} updatedAt={{ max_tiers: "2026-10-20T08:00:00Z" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Save fees and rules" }));
  await waitFor(() => expect(screen.getByText("max_tiers must be a whole number from 1 to 5")).toBeTruthy());
  expect(screen.getByText(/Last changed/)).toBeTruthy();
  await waitFor(() => expect(screen.getByRole("button", { name: "Save time windows" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Save time windows" }));
  await waitFor(() => expect(actions.saveTimeWindows).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByRole("button", { name: "Save payment and contact" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Save payment and contact" }));
  await waitFor(() => expect(actions.savePaymentAndContact).toHaveBeenCalled());

  fireEvent.change(screen.getByLabelText("Classic · base price (ZMW)"), { target: { value: "1350" } });
  fireEvent.click(screen.getByRole("button", { name: "Save prices" }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Classic base price: K1,300 → K1,350"));
});

it("renders grouped flavours and decimal size multipliers and saves each section", async () => {
  render(<SettingsManager catalogue={defaultCatalogue()} />);
  expect(screen.getByRole("heading", { name: "Classic" })).toBeTruthy();
  expect(screen.getByLabelText("12-inch multiplier").getAttribute("value")).toBe("1.20");

  fireEvent.change(screen.getByLabelText("Classic · base price (ZMW)"), { target: { value: "1350" } });
  fireEvent.click(screen.getByRole("button", { name: "Save prices" }));
  await waitFor(() => expect(actions.savePrices).toHaveBeenCalledWith(expect.objectContaining({ flavourGroupPrices: expect.objectContaining({ classic: "1350" }) })));

  fireEvent.change(screen.getByLabelText("12-inch multiplier"), { target: { value: "1.25" } });
  fireEvent.click(screen.getByRole("button", { name: "Save sizes" }));
  await waitFor(() => expect(actions.savePrices).toHaveBeenLastCalledWith(expect.objectContaining({ sizeMultipliers: expect.objectContaining({ "12": "1.25" }) })));
});

it("sends show and hide actions for catalogue choices", async () => {
  const catalogue = defaultCatalogue();
  render(<SettingsManager catalogue={{ ...catalogue, flavours: catalogue.flavours.map((item, index) => index === 0 ? { ...item, active: false } : item) }} />);
  fireEvent.click(screen.getByRole("button", { name: "Show" }));
  await waitFor(() => expect(actions.manageCatalogueItem).toHaveBeenCalledWith({ kind: "flavour", operation: "show", key: catalogue.flavours[0].key }));
});
