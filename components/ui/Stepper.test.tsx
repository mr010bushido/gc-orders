import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('shows the phone overline and one segment per step', () => {
    const { container } = render(<Stepper steps={['Cake', 'Details', 'Date', 'Review']} current={1} />);
    expect(screen.getByText('Step 2 of 4 · Details')).toBeTruthy();
    const segments = container.querySelectorAll('[data-state]');
    expect([...segments].map((s) => s.getAttribute('data-state'))).toEqual(['done', 'current', 'todo', 'todo']);
    expect(segments[0].className).toContain('bg-brand');
    expect(segments[1].className).toContain('bg-brand');
    expect(segments[2].className).toContain('bg-line');
  });

  it('follows the number of steps the caller passes', () => {
    const { container } = render(<Stepper steps={['Cake', 'Details', 'Review']} current={1} />);
    expect(screen.getByText('Step 2 of 3 · Details')).toBeTruthy();
    expect(container.querySelectorAll('[data-state]')).toHaveLength(3);
  });

  it('marks the current step with aria-current in both layouts', () => {
    const { container } = render(<Stepper steps={['Cake', 'Details', 'Review']} current={2} />);
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(2);
    expect(current[1].textContent).toContain('Review');
  });

  it('switches to numbered circles from tablet width', () => {
    const { container } = render(<Stepper steps={['Cake', 'Details']} current={0} />);
    expect(container.querySelector('.md\\:hidden')).toBeTruthy();
    expect(container.querySelector('.md\\:flex')!.textContent).toContain('1Cake');
  });
});
