import { StatusPill, type OrderStatus } from '../StatusPill';
import { cn } from './cn';
import { formatKwacha } from './format';

type OrderCardProps = {
  reference: string;
  date: string;
  status: OrderStatus;
  customer: string;
  summary: string;
  fulfilment: string;
  total: number;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  badge?: React.ReactNode;
};

export function OrderCard({
  reference, date, status, customer, summary, fulfilment, total, selected = false, onSelect, className, badge,
}: OrderCardProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-soft tabular-nums"><span className="truncate">{reference} · {date}</span>{badge}</span>
        <StatusPill status={status} size="sm" />
      </span>
      <span className="mt-1.5 block truncate text-base font-semibold text-ink">{customer} · {summary}</span>
      <span className="mt-1 flex justify-between gap-3 text-sm text-ink-soft">
        <span>{fulfilment}</span>
        <span className="font-medium text-ink tabular-nums">{formatKwacha(total)}</span>
      </span>
    </>
  );
  const classes = cn(
    'relative block w-full px-4 py-3 text-left',
    selected ? 'bg-selected before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand' : 'bg-surface',
    onSelect && !selected && 'hover:bg-selected',
    className,
  );

  return onSelect ? (
    <button type="button" onClick={onSelect} aria-current={selected || undefined} className={classes}>{body}</button>
  ) : (
    <div aria-current={selected || undefined} className={classes}>{body}</div>
  );
}
