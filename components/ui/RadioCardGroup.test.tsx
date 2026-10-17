import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RadioCardGroup, type RadioCardOption } from './RadioCardGroup';

const options: RadioCardOption[] = [
  { value: 'delivery', label: 'Delivery', description: 'K150 in Lusaka' },
  { value: 'pickup', label: 'Pickup', description: 'From the shop' },
];

function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState<string | null>('delivery');
  return (
    <RadioCardGroup legend="Fulfilment" options={options} value={value}
      onChange={(v) => { setValue(v); onChange(v); }} />
  );
}

describe('RadioCardGroup', () => {
  it('renders real radios inside label cards in a two-column grid', () => {
    const { container } = render(<RadioCardGroup legend="Fulfilment" options={options} value={null} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Fulfilment' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /Delivery/ }).closest('label')).toBeTruthy();
    expect(container.querySelector('.grid-cols-2')).toBeTruthy();
  });

  it('marks the selected card with a 1.5px brick border', () => {
    render(<RadioCardGroup legend="Fulfilment" options={options} value="pickup" onChange={() => {}} />);
    const card = screen.getByRole('radio', { name: /Pickup/ }).closest('label')!;
    expect(card.className).toContain('border-[1.5px]');
    expect(card.className).toContain('border-brand');
    expect(screen.getByRole('radio', { name: /Delivery/ }).closest('label')!.className).toContain('border-line-strong');
  });

  it('selects on click', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByText('Pickup'));
    expect(onChange).toHaveBeenCalledWith('pickup');
    expect(screen.getByRole('radio', { name: /Pickup/ })).toHaveProperty('checked', true);
  });

  it('moves the selection with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole('radio', { name: /Delivery/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('pickup');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /Pickup/ }));
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('delivery');
  });
});
