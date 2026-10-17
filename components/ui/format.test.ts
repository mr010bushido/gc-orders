import { describe, expect, it } from 'vitest';
import { formatKwacha } from './format';

describe('formatKwacha', () => {
  it.each([[2650, 'K2,650'], [1300, 'K1,300'], [150, 'K150'], [0, 'K0'], [1234567, 'K1,234,567'], [-150, '-K150']])(
    '%d → %s', (amount, text) => expect(formatKwacha(amount)).toBe(text),
  );
});
