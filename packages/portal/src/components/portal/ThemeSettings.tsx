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

const OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: 'Hell', description: 'Helles Farbschema' },
  { value: 'dark', label: 'Dunkel', description: 'Dunkles Farbschema' },
  { value: 'system', label: 'System', description: 'Folgt deinen Geräteeinstellungen' },
];

export default function ThemeSettings() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem('portal-theme') as Theme | null) ?? 'system';
    setTheme(stored);
    applyTheme(stored);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if ((localStorage.getItem('portal-theme') ?? 'system') === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function select(next: Theme) {
    setTheme(next);
    localStorage.setItem('portal-theme', next);
    applyTheme(next);
  }

  if (!mounted) {
    return <div className="h-32" aria-hidden />;
  }

  return (
    <fieldset>
      <legend className="sr-only">Farbschema</legend>
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const selected = theme === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={opt.value}
                checked={selected}
                onChange={() => select(opt.value)}
                className="mt-0.5 accent-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
