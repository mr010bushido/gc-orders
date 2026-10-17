'use client';
import { useId, type ReactNode } from 'react';
import { cn } from './cn';

export type RadioCardOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

type RadioCardGroupProps = {
  legend: string;
  options: RadioCardOption[];
  value: string | null;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
};

// Native radios give arrow-key selection within the group for free.
export function RadioCardGroup({ legend, options, value, onChange, name, className }: RadioCardGroupProps) {
  const autoName = useId();
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-11 cursor-pointer flex-col gap-1 rounded-md bg-surface',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink',
                selected ? 'border-[1.5px] border-brand p-[15.5px]' : 'border border-line-strong p-4',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name ?? autoName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              {option.icon && (
                <span className={selected ? 'text-brand-ink' : 'text-ink-soft'}>{option.icon}</span>
              )}
              <span className="text-base font-semibold text-ink">{option.label}</span>
              {option.description && <span className="text-sm text-ink-soft">{option.description}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
