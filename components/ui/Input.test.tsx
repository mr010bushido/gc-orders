import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders a visible label above a 48px, 16px-text field', () => {
    const { container } = render(<Input label="Your name" placeholder="Mwila" defaultValue="Chanda" />);
    const input = screen.getByLabelText('Your name');
    expect(input.className).toContain('h-12');
    expect(input.className).toContain('text-base');
    const label = container.querySelector('label')!;
    expect(label.textContent).toBe('Your name');
    expect(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('links helper text through aria-describedby', () => {
    render(<Input label="Phone" helper="We text your reference here" />);
    expect(screen.getByLabelText('Phone')).toHaveProperty('ariaInvalid', null);
    expect(screen.getByRole('textbox', { description: 'We text your reference here' })).toBeTruthy();
  });

  it('shows an error with aria-invalid, icon and error tokens', () => {
    render(<Input label="Phone" helper="ignored" error="Enter a Zambian mobile number" />);
    const input = screen.getByRole('textbox', { description: 'Enter a Zambian mobile number' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.className).toContain('border-err-ink');
    const message = document.getElementById(input.getAttribute('aria-describedby')!)!;
    expect(message.className).toContain('text-err-ink');
    expect(message.querySelector('svg')).toBeTruthy();
  });

  it('uses the normal border without an error', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name').className).toContain('border-line-strong');
  });
});
