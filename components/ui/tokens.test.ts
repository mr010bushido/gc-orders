import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'components/ui');
const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));

// A `dark:` variant on any colour-bearing utility.
const darkColour = /\bdark:(?:hover:|focus:|focus-visible:|active:)*(?:bg|text|border|ring|outline|fill|stroke|divide|accent|shadow|from|to|via|decoration|placeholder|caret)-/;
const hex = /#[0-9a-fA-F]{3,8}\b/;
const rgb = /\b(?:rgb|rgba|hsl|hsla)\(/;

describe('components/ui use tokens only', () => {
  it('finds component files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no hex, rgb() or dark: colour classes', (file) => {
    const src = readFileSync(join(dir, file), 'utf8');
    expect(src).not.toMatch(hex);
    expect(src).not.toMatch(rgb);
    expect(src).not.toMatch(darkColour);
  });

  it('only Sheet uses the float shadow', () => {
    const users = files.filter((f) => readFileSync(join(dir, f), 'utf8').includes('shadow-float'));
    expect(users.every((f) => f === 'Sheet.tsx')).toBe(true);
  });

  it('the scanner catches violations', () => {
    expect('text-[#9E2B2E]').toMatch(hex);
    expect('dark:bg-ink').toMatch(darkColour);
    expect('dark:hover:text-ink').toMatch(darkColour);
    expect('rgba(0,0,0,.5)').toMatch(rgb);
  });
});
