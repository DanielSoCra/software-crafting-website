'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('portal-theme') as Theme | null;
    const initial = stored ?? 'system';
    setTheme(initial);
    applyTheme(initial);

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if ((localStorage.getItem('portal-theme') ?? 'system') === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function cycle() {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    localStorage.setItem('portal-theme', next);
    applyTheme(next);
  }

  if (!mounted) return null;

  const icons: Record<Theme, string> = {
    light: '\u2600\uFE0F',  // sun
    dark: '\uD83C\uDF19',   // moon
    system: '\uD83D\uDCBB', // computer
  };

  const labels: Record<Theme, string> = {
    light: 'Hell',
    dark: 'Dunkel',
    system: 'Automatisch',
  };

  return (
    <button
      onClick={cycle}
      className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5"
      title={`Darstellung: ${labels[theme]}`}
      aria-label={`Darstellung wechseln (aktuell: ${labels[theme]})`}
    >
      <span className="text-base leading-none">{icons[theme]}</span>
      <span className="hidden sm:inline">{labels[theme]}</span>
    </button>
  );
}
