'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { StatusPill, type OrderStatus } from '../StatusPill';
import { cn } from './cn';
import { CloseIcon } from './icons';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  reference?: string;
  status?: OrderStatus;
  flagged?: boolean;
  /** Ghost and primary buttons, laid out 1fr / 2fr. Pass them with `block`. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

// The native modal <dialog> gives focus trapping, Escape and an inert page for free.
export function Sheet({ open, onClose, title, reference, status, flagged = false, actions, children, className }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const isOpen = useRef(open);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    isOpen.current = open;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement as HTMLElement | null;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
    if (!open && opener.current) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      // Escape and other native closes land here; tell the parent unless it closed us itself.
      onClose={() => isOpen.current && onClose()}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim"
    >
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-lg bg-surface text-ink shadow-float',
          'lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[440px] lg:rounded-none lg:border-l lg:border-line',
          className,
        )}
      >
        <div aria-hidden="true" data-handle className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong lg:hidden" />
        <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-3 lg:pt-4">
          <div className="min-w-0 flex-1">
            {reference && <p className="text-xs text-ink-soft tabular-nums">{reference}</p>}
            <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
            {(status || flagged) && <div className="mt-1.5 flex items-center gap-2">{status && <StatusPill status={status} size="sm" />}{flagged && <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn-ink">Flagged</span>}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-selected hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {actions && (
          <div className="sticky bottom-0 grid grid-cols-[1fr_2fr] gap-3 border-t border-line bg-surface p-4">{actions}</div>
        )}
      </div>
    </dialog>
  );
}
