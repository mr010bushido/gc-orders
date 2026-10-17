import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderCard } from './OrderCard';

const order = {
  reference: 'CAKE-2026-0042', date: 'Sat 19 Sep', status: 'awaiting_verification' as const,
  customer: 'Mwila Banda', summary: 'Chocolate, 2 tiers', fulfilment: 'Delivery', total: 2650,
};

describe('OrderCard', () => {
  it('shows reference, date and pill, then customer and summary, then fulfilment and total', () => {
    const { container } = render(<OrderCard {...order} />);
    const lines = (container.firstChild as HTMLElement).children;
    expect(lines[0].textContent).toBe('CAKE-2026-0042 · Sat 19 SepAwaiting verification');
    expect(lines[1].textContent).toBe('Mwila Banda · Chocolate, 2 tiers');
    expect(lines[1].className).toContain('font-semibold');
    expect(lines[2].textContent).toBe('DeliveryK2,650');
  });

  it('uses the selected background and the 3px brick bar when selected', () => {
    const { container, rerender } = render(<OrderCard {...order} />);
    const card = () => container.firstChild as HTMLElement;
    expect(card().className).toContain('bg-surface');
    expect(card().className).not.toContain('before:bg-brand');
    rerender(<OrderCard {...order} selected />);
    expect(card().className).toContain('bg-selected');
    expect(card().className).toContain('before:w-[3px]');
    expect(card().className).toContain('before:bg-brand');
  });

  it('is a button when it can be selected', async () => {
    const onSelect = vi.fn();
    render(<OrderCard {...order} selected onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /CAKE-2026-0042/ });
    expect(button.getAttribute('aria-current')).toBe('true');
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
