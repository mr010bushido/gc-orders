type IntegerSetting = { type: "integer"; default: number | null; min: number; max?: number; nullable?: true };
type TextSetting = { type: "text"; default: string | null };
type TimeSetting = { type: "time"; default: string | null };
type Setting = IntegerSetting | TextSetting | TimeSetting;

// Business bounds only where agreed (max tiers 1–5). Other numbers are only checked for technical validity:
// a non-negative safe integer (positive where the pricing maths divides or needs one item). Window hours stay
// unset until the owner configures them; customer booking must not go live before they are set.
const time = { type: "time", default: null } as const;

export const SETTINGS = {
  max_tiers: { type: "integer", default: 3, min: 1, max: 5 },
  delivery_fee: { type: "integer", default: 150, min: 0 },
  rush_rate_percent: { type: "integer", default: 20, min: 0 },
  rush_window_hours: { type: "integer", default: 48, min: 0 },
  dessert_min_quantity: { type: "integer", default: 30, min: 1 },
  dessert_lead_days: { type: "integer", default: 5, min: 0 },
  dessert_surcharge_percent: { type: "integer", default: 20, min: 0 },
  capacity_per_day: { type: "integer", default: 10, min: 0 },
  payment_expiry_hours: { type: "integer", default: 24, min: 0 },
  morning_start_hour: time,
  morning_end_hour: time,
  afternoon_start_hour: time,
  afternoon_end_hour: time,
  evening_start_hour: time,
  evening_end_hour: time,
  airtel_number: { type: "text", default: "+260776597882" },
  mtn_number: { type: "text", default: "+260966222440" },
  pickup_map_url: { type: "text", default: "https://maps.app.goo.gl/TXkVWRMSbxbA88K26?g_st=ac" },
  owner_alert_phone: { type: "text", default: null },
} as const satisfies Record<string, Setting>;

export type SettingKey = keyof typeof SETTINGS;
export type Settings = { readonly [K in SettingKey]: (typeof SETTINGS)[K] extends { type: "text" | "time" } ? string | null
  : (typeof SETTINGS)[K] extends { nullable: true } ? number | null : number };

export function isSettingKey(key: string): key is SettingKey {
  return Object.hasOwn(SETTINGS, key);
}

/** Returns the value if it is valid for the key, otherwise throws a RangeError naming the allowed range. */
export function checkSetting(key: string, value: unknown): number | string | null {
  if (!isSettingKey(key)) throw new RangeError(`unknown setting ${key}`);
  const setting: Setting = SETTINGS[key];
  if (setting.type === "time") {
    if (value === null) return null;
    if (Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 24) {
      return `${String(value).padStart(2, "0")}:00`;
    }
    if (typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) return value;
    throw new RangeError(`${key} must be a 24-hour time in HH:MM format`);
  }
  if (setting.type === "text") {
    if (value === null || typeof value === "string") return value;
    throw new RangeError(`${key} must be text`);
  }
  if (value === null && setting.nullable) return null;
  const max = setting.max ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(value) || (value as number) < setting.min || (value as number) > max) {
    throw new RangeError(`${key} must be a whole number from ${setting.min}${setting.max === undefined ? " up" : ` to ${setting.max}`}`);
  }
  return value as number;
}

/** Builds settings from stored rows, falling back to the default (with a warning) for missing or invalid values. */
export function resolveSettings(rows: readonly { key: string; value: unknown }[]): Settings {
  const stored = new Map(rows.map(row => [row.key, row.value]));
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(SETTINGS) as SettingKey[]) {
    result[key] = SETTINGS[key].default;
    if (!stored.has(key)) continue;
    try {
      result[key] = checkSetting(key, stored.get(key));
    } catch (error) {
      console.warn(`setting ${key} is invalid, using the default: ${(error as Error).message}`);
    }
  }
  return Object.freeze(result) as Settings;
}
