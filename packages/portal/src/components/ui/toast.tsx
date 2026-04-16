'use client';

import { useEffect, useState } from 'react';

/**
 * Minimal fire-and-forget toast primitive.
 * No provider, no ref-plumbing — the component listens for a DOM CustomEvent
 * ('app-toast') and renders a stack of messages in the top-right corner.
 * Call `toast.error('Fehler beim Speichern')` from anywhere.
 *
 * Intentionally tiny — if we grow beyond error notices, replace with sonner.
 */

type ToastKind = 'error' | 'info';
interface ToastDetail {
  id: number;
  kind: ToastKind;
  message: string;
}

const EVENT_NAME = 'app-toast';
let nextId = 1;

function emit(kind: ToastKind, message: string) {
  if (typeof window === 'undefined') return;
  const detail: ToastDetail = { id: nextId++, kind, message };
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT_NAME, { detail }));
}

export const toast = {
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastDetail[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      setToasts(prev => [...prev, detail]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== detail.id));
      }, 5000);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={
            t.kind === 'error'
              ? 'rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm shadow-md'
              : 'rounded-md border border-border bg-card text-foreground px-4 py-3 text-sm shadow-md'
          }
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
