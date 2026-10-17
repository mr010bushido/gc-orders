import { cn } from './cn';

type StepperProps = { steps: string[]; current: number; className?: string };

export function Stepper({ steps, current, className }: StepperProps) {
  const state = (i: number) => (i < current ? 'done' : i === current ? 'current' : 'todo');

  return (
    <div className={className}>
      {/* Phones: overline over segments */}
      <div className="md:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Step {current + 1} of {steps.length} · {steps[current]}
        </p>
        <ol className="flex gap-1.5" aria-hidden="true">
          {steps.map((label, i) => (
            <li
              key={label}
              data-state={state(i)}
              aria-current={i === current ? 'step' : undefined}
              className={cn('h-[3px] flex-1 rounded-full', i <= current ? 'bg-brand' : 'bg-line')}
            />
          ))}
        </ol>
      </div>

      {/* Tablet and up: numbered circles joined by lines */}
      <ol className="hidden items-center md:flex">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === current ? 'step' : undefined}
            className={cn('flex items-center gap-2', i < steps.length - 1 && 'flex-1')}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                i <= current ? 'bg-brand text-on-brand' : 'border border-line-strong text-ink-soft',
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-sm', i === current ? 'font-semibold text-ink' : 'text-ink-soft')}>
              {label}
              {i < current && <span className="sr-only"> (done)</span>}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={cn('mx-1 h-px flex-1', i < current ? 'bg-brand' : 'bg-line')} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
