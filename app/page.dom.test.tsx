import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('next/image', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => null }));

describe('home page', () => {
  it('links to booking and booking lookup', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: 'Book a Cake' }).getAttribute('href')).toBe('/book');
    expect(screen.getByRole('link', { name: 'Find my booking' }).getAttribute('href')).toBe('/order');
  });
});
