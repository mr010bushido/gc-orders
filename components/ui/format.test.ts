import { describe, expect, it } from 'vitest';
import { formatEventDate, formatKwacha } from './format';

describe('formatKwacha', () => {
  it.each([[2650, 'K2,650'], [1300, 'K1,300'], [150, 'K150'], [0, 'K0'], [1234567, 'K1,234,567'], [-150, '-K150']])(
    '%d → %s', (amount, text) => expect(formatKwacha(amount)).toBe(text),
  );
});

describe('formatEventDate', () => {
  it('writes the day in full', () => expect(formatEventDate('2026-10-29')).toBe('29 October 2026'));
});
