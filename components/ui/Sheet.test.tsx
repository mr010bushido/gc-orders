import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Sheet } from './Sheet';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open order</button>
      <Sheet
        open={open}
        onClose={() => { setOpen(false); onClose(); }}
        title="Chocolate, 2 tiers"
        reference="CAKE-2026-0042"
        status="awaiting_verification"
        actions={<><Button variant="ghost" block>Reject</Button><Button block>Verify payment</Button></>}
      >
        <dl><div><dt>Customer</dt><dd>Mwila Banda</dd></div></dl>
      </Sheet>
    </>
  );
}

const dialog = () => document.querySelector('dialog')!;

describe('Sheet', () => {
  it('opens as a modal dialog with handle, header, body and action bar', async () => {
    render(<Harness />);
    expect(dialog().hasAttribute('open')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Open order' }));
    expect(dialog().hasAttribute('open')).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Chocolate, 2 tiers' })).toBeTruthy();
    expect(screen.getByText('CAKE-2026-0042')).toBeTruthy();
    expect(screen.getByText('Awaiting verification')).toBeTruthy();
    expect(dialog().querySelector('[data-handle]')!.className).toContain('lg:hidden');
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('size-11');
    expect(screen.getByRole('button', { name: 'Verify payment' }).parentElement!.className).toContain('grid-cols-[1fr_2fr]');
  });

  it('is a bottom sheet on phones and a right-hand panel from desktop width', () => {
    render(<Sheet open onClose={() => {}} title="Order">Body</Sheet>);
    const panel = dialog().firstElementChild!;
    expect(panel.className).toContain('bottom-0');
    expect(panel.className).toContain('rounded-t-lg');
    expect(panel.className).toContain('lg:right-0');
    expect(panel.className).toContain('lg:inset-y-0');
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open order' });
    await userEvent.click(opener);
    screen.getByRole('button', { name: 'Close' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(dialog().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes on the close button and on a scrim click, but not on a click inside', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open order' }));
    await userEvent.click(screen.getByText('Mwila Banda'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open order' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open order' }));
    await userEvent.click(dialog());
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('uses the float shadow', () => {
    render(<Sheet open onClose={() => {}} title="Order">Body</Sheet>);
    expect(dialog().firstElementChild!.className).toContain('shadow-float');
  });
});
