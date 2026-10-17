import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from './DatePicker';

const day = (date: string) => document.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!;
const focused = () => (document.activeElement as HTMLElement).dataset.date;
const base = { today: '2026-09-10', onChange: () => {} };

function Harness(props: Partial<Parameters<typeof DatePicker>[0]>) {
  const [value, setValue] = useState<string | null>(props.value ?? '2026-09-15');
  return <DatePicker {...base} {...props} value={value} onChange={(d) => { setValue(d); props.onChange?.(d); }} />;
}

describe('DatePicker', () => {
  it('shows the month in the display font by default and sans for owners', () => {
    const { rerender } = render(<DatePicker {...base} value={null} />);
    expect(screen.getByText('September 2026').className).toContain('font-display');
    rerender(<DatePicker {...base} value={null} monthFont="sans" />);
    const title = screen.getByText('September 2026');
    expect(title.className).toContain('font-sans');
    expect(title.className).not.toContain('font-display');
  });

  it('lays out a Monday-first month grid', () => {
    render(<DatePicker {...base} value={null} />);
    // 1 September 2026 is a Tuesday.
    const firstRow = screen.getAllByRole('row')[1];
    expect(firstRow.querySelectorAll('td')[0].textContent).toBe('');
    expect(firstRow.querySelectorAll('td')[1].textContent).toBe('1');
    expect(document.querySelectorAll('[data-date]')).toHaveLength(30);
  });

  it('does not select a closed day and shows it struck through', async () => {
    const onChange = vi.fn();
    render(<DatePicker {...base} value={null} onChange={onChange} closedDates={['2026-09-18']} />);
    await userEvent.click(day('2026-09-18'));
    expect(onChange).not.toHaveBeenCalled();
    expect(day('2026-09-18').className).toContain('line-through');
    expect(day('2026-09-18').className).toContain('text-disabled-ink');
    expect(day('2026-09-18').getAttribute('aria-disabled')).toBe('true');
  });

  it('marks rush days with the warning tokens and keeps them selectable', async () => {
    const onChange = vi.fn();
    render(<DatePicker {...base} value={null} onChange={onChange} isRush={(d) => d === '2026-09-15'} />);
    expect(day('2026-09-15').className).toContain('bg-warn-bg');
    expect(day('2026-09-15').className).toContain('text-warn-ink');
    expect(day('2026-09-15').getAttribute('aria-label')).toContain('rush');
    await userEvent.click(day('2026-09-15'));
    expect(onChange).toHaveBeenCalledWith('2026-09-15');
  });

  it('makes days before minDate and past days unavailable', async () => {
    const onChange = vi.fn();
    render(<DatePicker {...base} value={null} onChange={onChange} minDate="2026-09-20" />);
    for (const date of ['2026-09-05', '2026-09-12', '2026-09-19']) {
      await userEvent.click(day(date));
      expect(day(date).getAttribute('aria-disabled')).toBe('true');
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(day('2026-09-05').className).toContain('text-past');
    expect(day('2026-09-19').className).toContain('text-disabled-ink');
    await userEvent.click(day('2026-09-20'));
    expect(onChange).toHaveBeenCalledWith('2026-09-20');
  });

  it('shows the selected day as a brick-filled circle', () => {
    render(<DatePicker {...base} value="2026-09-22" />);
    expect(day('2026-09-22').className).toContain('bg-brand');
    expect(day('2026-09-22').className).toContain('rounded-full');
    expect(day('2026-09-22').closest('td')!.getAttribute('aria-selected')).toBe('true');
  });

  it('moves focus by day, week, row edge and month, and selects with Enter or Space', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    day('2026-09-15').focus(); // Tuesday

    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('2026-09-16');
    await userEvent.keyboard('{ArrowDown}');
    expect(focused()).toBe('2026-09-23');
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
    expect(focused()).toBe('2026-09-15');
    await userEvent.keyboard('{Home}');
    expect(focused()).toBe('2026-09-14');
    await userEvent.keyboard('{End}');
    expect(focused()).toBe('2026-09-20');
    await userEvent.keyboard('{PageDown}');
    expect(focused()).toBe('2026-10-20');
    expect(screen.getByText('October 2026')).toBeTruthy();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20');
    await userEvent.keyboard('{PageUp}{ArrowRight}[Space]');
    expect(focused()).toBe('2026-09-21');
    expect(onChange).toHaveBeenLastCalledWith('2026-09-21');
  });

  it('crosses a month boundary with the arrow keys and clamps PageDown to the month length', async () => {
    render(<Harness value="2026-10-31" />);
    day('2026-10-31').focus();
    await userEvent.keyboard('{PageDown}');
    expect(focused()).toBe('2026-11-30');
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('2026-12-01');
    expect(screen.getByText('December 2026')).toBeTruthy();
  });

  it('keeps one day in the tab order and pages months with the buttons', async () => {
    render(<DatePicker {...base} value="2026-09-15" />);
    expect(document.querySelectorAll('[data-date][tabindex="0"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Previous month' })).toHaveProperty('disabled', true);
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('October 2026')).toBeTruthy();
    expect(day('2026-10-01').tabIndex).toBe(0);
  });
});
