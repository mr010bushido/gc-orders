import { cn } from './cn';
import { formatKwacha } from './format';

export type SummaryLine = { label: string; amount: number; kind?: 'rush' };

type SummaryCardProps = {
  lines: SummaryLine[];
  total: number;
  deposit: number;
  totalLabel?: string;
  depositLabel?: string;
  className?: string;
};

export function SummaryCard({
  lines, total, deposit, totalLabel = 'Total', depositLabel = 'Deposit due now (50%)', className,
}: SummaryCardProps) {
  return (
    <div className={cn('overflow-hidden rounded-md border border-line bg-surface', className)}>
      <dl className="divide-y divide-line px-4">
        {lines.map((line, i) => (
          <div
            key={`${line.label}-${i}`}
            className={cn('flex justify-between gap-4 py-3 text-sm', line.kind === 'rush' ? 'text-warn-ink' : 'text-ink-soft')}
          >
            <dt>{line.label}</dt>
            <dd className="tabular-nums">{formatKwacha(line.amount)}</dd>
          </div>
        ))}
      </dl>
      <dl>
        <div className="flex items-baseline justify-between gap-4 border-t border-line bg-gold-wash px-4 py-3">
          <dt className="text-base font-semibold text-ink">{totalLabel}</dt>
          <dd className="font-display text-[34px] leading-10 text-ink tabular-nums">{formatKwacha(total)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line px-4 py-3 text-base font-semibold text-brand-ink">
          <dt>{depositLabel}</dt>
          <dd className="tabular-nums">{formatKwacha(deposit)}</dd>
        </div>
      </dl>
    </div>
  );
}
