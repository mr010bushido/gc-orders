import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Banner } from './Banner';

describe('Banner', () => {
  it('gives the warning kind role="alert" and the warning tokens', () => {
    render(<Banner kind="warning" lead="Rush order.">A 20% fee applies.</Banner>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-warn-bg');
    expect(alert.textContent).toBe('Rush order. A 20% fee applies.');
  });

  it.each([['info', 'bg-info-bg'], ['success', 'bg-ok-bg']] as const)('%s has no alert role', (kind, bg) => {
    const { container } = render(<Banner kind={kind} lead="Note.">Body</Banner>);
    expect(screen.queryByRole('alert')).toBeNull();
    expect((container.firstChild as HTMLElement).className).toContain(bg);
  });

  it('shows a 20px icon and a bold lead phrase', () => {
    const { container } = render(<Banner lead="Paid.">Thanks</Banner>);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('20');
    expect(screen.getByText('Paid.').tagName).toBe('STRONG');
  });
});
