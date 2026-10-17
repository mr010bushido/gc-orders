import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddonList, type Addon } from './AddonList';

const addons: Addon[] = [
  { key: 'topper', label: 'Name topper', price: 150 },
  { key: 'candles', label: 'Candles', price: 50 },
];

describe('AddonList', () => {
  it('renders one bordered list of 52px checkbox rows with tabular prices', () => {
    const { container } = render(
      <AddonList legend="Add-ons" addons={addons} selected={new Set(['candles'])} onChange={() => {}} />,
    );
    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelector('ul')!.className).toContain('divide-line');
    expect(screen.getByRole('checkbox', { name: /Candles/ })).toHaveProperty('checked', true);
    expect(screen.getByRole('checkbox', { name: /Name topper/ })).toHaveProperty('checked', false);
    const row = screen.getByRole('checkbox', { name: /Candles/ }).closest('label')!;
    expect(row.className).toContain('min-h-[52px]');
    const price = screen.getByText('K150');
    expect(price.className).toContain('tabular-nums');
  });

  it('adds a key when a row is clicked', async () => {
    const onChange = vi.fn();
    render(<AddonList legend="Add-ons" addons={addons} selected={new Set(['candles'])} onChange={onChange} />);
    await userEvent.click(screen.getByText('Name topper'));
    expect([...onChange.mock.calls[0][0]].sort()).toEqual(['candles', 'topper']);
  });

  it('removes a key when a selected row is clicked', async () => {
    const onChange = vi.fn();
    render(<AddonList legend="Add-ons" addons={addons} selected={new Set(['candles'])} onChange={onChange} />);
    await userEvent.click(screen.getByText('Candles'));
    expect([...onChange.mock.calls[0][0]]).toEqual([]);
  });
});
