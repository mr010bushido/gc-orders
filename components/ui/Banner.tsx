import type { ReactNode } from 'react';
import { cn } from './cn';
import { InfoIcon, SuccessIcon, WarningIcon } from './icons';

type BannerKind = 'info' | 'warning' | 'success';

const KINDS: Record<BannerKind, { box: string; Icon: typeof InfoIcon }> = {
  info: { box: 'bg-info-bg text-info-ink', Icon: InfoIcon },
  warning: { box: 'bg-warn-bg text-warn-ink', Icon: WarningIcon },
  success: { box: 'bg-ok-bg text-ok-ink', Icon: SuccessIcon },
};

type BannerProps = { kind?: BannerKind; lead: string; children?: ReactNode; className?: string };

export function Banner({ kind = 'info', lead, children, className }: BannerProps) {
  const { box, Icon } = KINDS[kind];
  return (
    <div role={kind === 'warning' ? 'alert' : undefined} className={cn('flex gap-3 rounded-md p-3.5 text-sm', box, className)}>
      <Icon size={20} className="shrink-0" />
      <p>
        <strong className="font-semibold">{lead}</strong>
        {children && <> {children}</>}
      </p>
    </div>
  );
}
