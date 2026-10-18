'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from './cn';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

// All dates are `YYYY-MM-DD` strings. Arithmetic goes through UTC milliseconds only,
// so the server or browser timezone never shifts a day.
const DAY = 86_400_000;
const toMs = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => fromMs(toMs(date) + n * DAY);
const daysInMonth = (month: string) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
/** Monday = 0 … Sunday = 6. */
const weekday = (date: string) => (new Date(toMs(date)).getUTCDay() + 6) % 7;

function addMonths(date: string, n: number) {
  const index = +date.slice(0, 4) * 12 + (+date.slice(5, 7) - 1) + n;
  const month = `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
  return `${month}-${String(Math.min(+date.slice(8, 10), daysInMonth(month))).padStart(2, '0')}`;
}

const monthTitle = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const WEEKDAYS = [['Mo', 'Monday'], ['Tu', 'Tuesday'], ['We', 'Wednesday'], ['Th', 'Thursday'], ['Fr', 'Friday'], ['Sa', 'Saturday'], ['Su', 'Sunday']];

type DatePickerProps = {
  value: string | null;
  onChange: (date: string) => void;
  /** Today's calendar date in Africa/Lusaka. */
  today: string;
  minDate?: string;
  closedDates?: readonly string[];
  isRush?: (date: string) => boolean;
  monthFont?: 'display' | 'sans';
  label?: string;
  className?: string;
};

export function DatePicker({
  value, onChange, today, minDate, closedDates = [], isRush = () => false,
  monthFont = 'display', label = 'Choose a date', className,
}: DatePickerProps) {
  const start = value ?? (minDate && minDate > today ? minDate : today);
  const [month, setMonth] = useState(start.slice(0, 7));
  const [focused, setFocused] = useState(start);
  const grid = useRef<HTMLTableElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, month]);

  const closed = new Set(closedDates);
  const status = (date: string) =>
    date < today ? 'past' : minDate && date < minDate ? 'unavailable' : closed.has(date) ? 'closed' : 'open';

  const first = `${month}-01`;
  const count = daysInMonth(month);
  const days = Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const cells: (string | null)[] = [...Array(weekday(first)).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const tabbable = focused.startsWith(month) ? focused : first;
  const earliestMonth = (minDate && minDate > today ? minDate : today).slice(0, 7);

  const go = (date: string) => {
    moveFocus.current = true;
    setFocused(date);
    setMonth(date.slice(0, 7));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const date = event.currentTarget.dataset.date!;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => addDays(date, -weekday(date)),
      End: () => addDays(date, 6 - weekday(date)),
      PageUp: () => addMonths(date, -1),
      PageDown: () => addMonths(date, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    go(move());
  };

  const showMonth = (n: number) => setMonth(addMonths(first, n).slice(0, 7));

  return (
    <div className={cn('rounded-md border border-line bg-surface p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => showMonth(-1)} disabled={month <= earliestMonth}
          className="flex size-11 items-center justify-center rounded-md text-ink hover:bg-selected disabled:text-disabled-ink">
          <ChevronLeftIcon />
        </button>
        <p aria-live="polite"
          className={monthFont === 'display' ? 'font-display text-2xl font-medium text-ink' : 'font-sans text-base font-semibold text-ink'}>
          {monthTitle.format(new Date(toMs(first)))}
        </p>
        <button type="button" aria-label="Next month" onClick={() => showMonth(1)}
          className="flex size-11 items-center justify-center rounded-md text-ink hover:bg-selected">
          <ChevronRightIcon />
        </button>
      </div>
      <table ref={grid} role="grid" aria-label={label} className="w-full border-collapse text-center">
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <th key={short} scope="col" abbr={long} className="pb-1 text-xs font-semibold text-ink-soft">{short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((date, d) => {
                if (!date) return <td key={d} />;
                const state = status(date);
                const available = state === 'open';
                const rush = available && isRush(date);
                const selected = date === value;
                const notes = [rush && 'rush', state === 'closed' && 'fully booked', !available && state !== 'closed' && 'unavailable'];
                return (
                  <td key={d} aria-selected={selected} className="p-0">
                    <button
                      type="button"
                      data-date={date}
                      data-state={selected ? 'selected' : rush ? 'rush' : state}
                      tabIndex={date === tabbable ? 0 : -1}
                      aria-disabled={!available || undefined}
                      aria-label={[dayName.format(new Date(toMs(date))), ...notes.filter(Boolean)].join(', ')}
                      onClick={() => {
                        setFocused(date);
                        if (available) onChange(date);
                      }}
                      onKeyDown={onKeyDown}
                      className={cn(
                        'mx-auto flex size-11 items-center justify-center rounded-full text-base tabular-nums',
                        selected
                          ? 'bg-brand font-semibold text-on-brand'
                          : rush
                            ? 'bg-warn-bg text-warn-ink hover:bg-selected'
                            : state === 'past'
                              ? 'cursor-default text-past'
                              : state === 'open'
                                ? 'text-ink hover:bg-selected'
                                : 'cursor-default text-disabled-ink',
                        state === 'closed' && 'line-through',
                      )}
                    >
                      {+date.slice(8, 10)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
