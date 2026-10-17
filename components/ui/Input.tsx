'use client';
import { useId, type InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { ErrorIcon } from './icons';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  helper?: string;
  error?: string;
};

export function Input({ label, helper, error, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? helper;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'h-12 w-full rounded-sm border bg-surface px-3.5 text-base text-ink placeholder:text-ink-mute',
          'focus-visible:border-brand',
          error ? 'border-err-ink' : 'border-line-strong',
          'disabled:bg-disabled-bg disabled:text-disabled-ink',
        )}
        {...rest}
      />
      {message && (
        <p id={messageId} className={cn('flex items-start gap-1.5 text-sm', error ? 'text-err-ink' : 'text-ink-soft')}>
          {error && <ErrorIcon size={16} className="mt-0.5 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
