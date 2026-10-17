'use client';
import { formatKwacha } from './format';

export type Addon = { key: string; label: string; price: number; description?: string };

type AddonListProps = {
  legend: string;
  addons: Addon[];
  selected: ReadonlySet<string>;
  onChange: (selected: Set<string>) => void;
  className?: string;
};

export function AddonList({ legend, addons, selected, onChange, className }: AddonListProps) {
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">
        {addons.map((addon) => (
          <li key={addon.key}>
            <label className="flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-brand"
                checked={selected.has(addon.key)}
                onChange={() => toggle(addon.key)}
              />
              <span className="flex flex-1 flex-col">
                <span className="text-base text-ink">{addon.label}</span>
                {addon.description && <span className="text-sm text-ink-soft">{addon.description}</span>}
              </span>
              <span className="text-base text-ink tabular-nums">{formatKwacha(addon.price)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
