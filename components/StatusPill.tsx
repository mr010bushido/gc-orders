export type OrderStatus =
  | 'new' | 'awaiting_quote' | 'awaiting_payment' | 'awaiting_verification' | 'confirmed' | 'completed' | 'expired';

const MAP: Record<OrderStatus, { label: string; pill: string; dot: string }> = {
  new:                   { label: 'New',                   pill: 'bg-gold-wash text-gold-ink',          dot: 'bg-gold' },
  awaiting_quote:        { label: 'Awaiting quote',        pill: 'bg-gold-wash text-gold-ink',          dot: 'bg-gold' },
  awaiting_payment:      { label: 'Awaiting payment',      pill: 'bg-warn-bg text-warn-ink',            dot: 'bg-warn-dot' },
  awaiting_verification: { label: 'Awaiting verification', pill: 'bg-info-bg text-info-ink',            dot: 'border-[1.5px] border-ink-mute' },
  confirmed:             { label: 'Confirmed',             pill: 'bg-ok-bg text-ok-ink',                dot: 'bg-ok-dot' },
  completed:             { label: 'Completed',             pill: 'border border-line-strong text-ink-soft', dot: '' },
  expired:               { label: 'Expired',               pill: 'bg-err-bg text-err-ink',              dot: 'bg-err-dot' },
};

export function StatusPill({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const statusStyle = MAP[status];
  return (
    <span className={`inline-flex items-center gap-[7px] rounded-full font-medium whitespace-nowrap ${
      size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[13px]'} ${statusStyle.pill}`}>
      {status === 'completed' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
      ) : (
        <span aria-hidden="true" className={`w-[7px] h-[7px] rounded-full ${statusStyle.dot}`} />
      )}
      {statusStyle.label}
    </span>
  );
}
