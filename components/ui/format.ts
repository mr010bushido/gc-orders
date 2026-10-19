const kwacha = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Whole Kwacha integer to `K1,300`. */
export function formatKwacha(amount: number) {
  return `${amount < 0 ? '-' : ''}K${kwacha.format(Math.abs(amount))}`;
}

/** A `YYYY-MM-DD` event date as `29 October 2026`, read in Africa/Lusaka whatever the machine's timezone. */
export function formatEventDate(date: string) {
  return new Date(`${date}T12:00:00+02:00`).toLocaleDateString('en-GB', { timeZone: 'Africa/Lusaka', day: 'numeric', month: 'long', year: 'numeric' });
}
