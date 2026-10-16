'use client';
import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  const selected = document.documentElement.dataset.theme;
  if (selected === 'light' || selected === 'dark') return selected;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener('gc-theme-change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener('gc-theme-change', onChange);
  };
}

function serverTheme() { return null; }

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, serverTheme);

  const choose = (selected: Theme) => {
    document.documentElement.dataset.theme = selected;
    try { localStorage.setItem('gc-theme', selected); } catch {}
    window.dispatchEvent(new Event('gc-theme-change'));
  };

  const seg = (on: boolean) =>
    `h-11 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
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
