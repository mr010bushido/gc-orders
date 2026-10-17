import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a 52px brick primary button by default', () => {
    render(<Button>Book</Button>);
    const button = screen.getByRole('button', { name: 'Book' });
    expect(button).toHaveProperty('type', 'button');
    expect(button.className).toContain('h-[52px]');
    expect(button.className).toContain('bg-brand');
    expect(button.className).toContain('w-full');
  });

  it('renders the ghost variant with an ink border and no fill', () => {
    render(<Button variant="ghost">Back</Button>);
    const button = screen.getByRole('button', { name: 'Back' });
    expect(button.className).toContain('border-ink');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).not.toContain('bg-brand');
  });

  it('does not fire onClick when disabled and uses the disabled tokens', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Pay</Button>);
    const button = screen.getByRole('button', { name: 'Pay' });
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button.className).toContain('disabled:bg-line');
    expect(button.className).toContain('disabled:text-disabled-ink');
  });

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Pay</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders an anchor with the same classes when given href', () => {
    render(<><Button href="/book">Book</Button><Button>Book</Button></>);
    const link = screen.getByRole('link', { name: 'Book' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/book');
    expect(link.className).toBe(screen.getByRole('button', { name: 'Book' }).className);
  });
});
