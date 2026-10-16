'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/** Light/Dark segmented switch. Writes data-theme on <html> and remembers the choice. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = (() => { try { return localStorage.getItem('gc-theme') as Theme | null; } catch { return null; } })();
    const system: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(saved ?? system);
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('gc-theme', t); } catch {}
  };

  const seg = (on: boolean) =>
    `h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
      on ? 'bg-ink text-bg' : 'bg-transparent text-ink-soft hover:text-ink'
    }`;

  return (
    <div role="group" aria-label="Colour theme"
         className="inline-flex gap-0.5 p-[3px] rounded-full border border-line-strong bg-surface">
      <button type="button" aria-pressed={theme === 'light'} onClick={() => choose('light')} className={seg(theme === 'light')}>
        Light
      </button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => choose('dark')} className={seg(theme === 'dark')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
        Dark
      </button>
    </div>
  );
}
