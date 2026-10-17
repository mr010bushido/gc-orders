import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryCard } from './SummaryCard';

const lines = [
  { label: 'Chocolate, 10" + 8"', amount: 2000 },
  { label: 'Rush fee (20%)', amount: 400, kind: 'rush' as const },
  { label: 'Delivery', amount: 150 },
];

describe('SummaryCard', () => {
  it('renders line items as dl rows with hairline dividers', () => {
    const { container } = render(<SummaryCard lines={lines} total={2550} deposit={1275} />);
    const list = container.querySelector('dl')!;
    expect(list.className).toContain('divide-line');
    expect(list.querySelectorAll('dt')).toHaveLength(3);
    expect(screen.getByText('K2,000')).toBeTruthy();
  });

  it('shows the rush line in the warning text token', () => {
    render(<SummaryCard lines={lines} total={2550} deposit={1275} />);
    expect(screen.getByText('Rush fee (20%)').parentElement!.className).toContain('text-warn-ink');
    expect(screen.getByText('Delivery').parentElement!.className).not.toContain('text-warn-ink');
  });

  it('shows the total on gold-wash in the 34px display font, with the deposit below', () => {
    render(<SummaryCard lines={lines} total={2650} deposit={1325} />);
    const total = screen.getByText('K2,650');
    expect(total.className).toContain('font-display');
    expect(total.className).toContain('text-[34px]');
    expect(total.parentElement!.className).toContain('bg-gold-wash');
    const deposit = screen.getByText('K1,325');
    expect(total.compareDocumentPosition(deposit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
