import { describe, expect, it, vi } from "vitest";
import { checkSetting, resolveSettings, SETTINGS } from "./settings";

describe("settings registry", () => {
  it("keeps the agreed defaults and leaves window hours and the alert phone unset", () => {
    const settings = resolveSettings([]);
    expect(settings).toMatchObject({
      max_tiers: 3, delivery_fee: 150, rush_rate_percent: 20, rush_window_hours: 48, dessert_min_quantity: 30,
      dessert_lead_days: 5, dessert_surcharge_percent: 20, capacity_per_day: 10, payment_expiry_hours: 24,
      morning_start_hour: null, evening_end_hour: null, owner_alert_phone: null,
    });
    expect(Object.isFrozen(settings)).toBe(true);
  });

  it("enforces the maximum tiers range 1 to 5", () => {
    expect(checkSetting("max_tiers", 1)).toBe(1);
    expect(checkSetting("max_tiers", 5)).toBe(5);
    for (const value of [0, 9, 2.5, "3", null]) {
      expect(() => checkSetting("max_tiers", value)).toThrow("max_tiers must be a whole number from 1 to 5");
    }
  });

  it("checks other numbers for technical validity only", () => {
    expect(checkSetting("delivery_fee", 0)).toBe(0);
    expect(checkSetting("capacity_per_day", 500)).toBe(500);
    for (const value of [-1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "150", null]) {
      expect(() => checkSetting("delivery_fee", value)).toThrow(RangeError);
    }
    expect(() => checkSetting("dessert_min_quantity", 0)).toThrow(RangeError);
  });

  it("accepts unset HH:MM windows and converts stored legacy hour integers", () => {
    expect(checkSetting("morning_start_hour", null)).toBeNull();
    expect(checkSetting("morning_start_hour", 8)).toBe("08:00");
    expect(checkSetting("morning_start_hour", "08:30")).toBe("08:30");
    expect(checkSetting("evening_end_hour", "24:00")).toBe("24:00");
    expect(() => checkSetting("morning_start_hour", 25)).toThrow(RangeError);
    expect(() => checkSetting("morning_start_hour", "24:01")).toThrow(RangeError);
    expect(() => checkSetting("morning_start_hour", "8:30")).toThrow(RangeError);
  });

  it("accepts text or null for text settings and rejects unknown keys", () => {
    expect(checkSetting("owner_alert_phone", null)).toBeNull();
    expect(checkSetting("airtel_number", "+260977659782")).toBe("+260977659782");
    expect(() => checkSetting("airtel_number", 260977659782)).toThrow(RangeError);
    expect(() => checkSetting("nonsense", 1)).toThrow("unknown setting");
  });

  it("falls back to the default with a warning for invalid stored values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const settings = resolveSettings([{ key: "max_tiers", value: 9 }, { key: "delivery_fee", value: 200 }, { key: "stale", value: 1 }]);
    expect(settings.max_tiers).toBe(SETTINGS.max_tiers.default);
    expect(settings.delivery_fee).toBe(200);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
