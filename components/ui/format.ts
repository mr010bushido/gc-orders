const kwacha = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Whole Kwacha integer to `K1,300`. */
export function formatKwacha(amount: number) {
  return `${amount < 0 ? '-' : ''}K${kwacha.format(Math.abs(amount))}`;
}
