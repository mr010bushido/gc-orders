export const IMAGE_RETENTION_DAYS = 90;
export const ORDER_RETENTION_YEARS = 2;
export const PENDING_UPLOAD_RETENTION_HOURS = 24;
export const NOTIFICATION_RETENTION_YEARS = 2;
export const RETENTION_BATCH_SIZE = 200;

export function lusakaDateAfterDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function lusakaDateAfterYears(date: string, years: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year + years, month - 1, day));
  // Calendar-year anniversaries clamp leap day to the last day of February.
  if (result.getUTCMonth() !== month - 1) result.setUTCDate(0);
  return result.toISOString().slice(0, 10);
}
