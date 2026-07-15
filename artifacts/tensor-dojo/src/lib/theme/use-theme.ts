

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'tld-theme';

/**
 * Resolve the initial theme using the same precedence as the inline
 * bootstrap script in app/layout.tsx: explicit localStorage first,
 * then the OS preference if known, then dark.
 */
function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const ls = window.localStorage.getItem(STORAGE_KEY);
    if (ls === 'dark' || ls === 'light') return ls;
  } catch {
    /* localStorage blocked (private mode, etc.) */
  }
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.media === '(prefers-color-scheme: dark)') {
      return mq.matches ? 'dark' : 'light';
    }
  }
  return 'dark';
}

/**
 * Read the live theme by inspecting the <html> class — the inline
 * bootstrap script may have set it before this hook mounts, so the
 * React state and the DOM need to agree.
 */
function readCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Toggle the theme. The `theme-switching` class disables every
 * transition for the duration of the swap, so colors don't tween
 * through the rest of the page.
 */
function applyTheme(next: Theme): void {
  const html = document.documentElement;
  html.classList.add('theme-switching');
  if (next === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  // Two RAFs: the first lets the class change paint, the second
  // lets the browser apply the new token values; only then do we
  // re-enable transitions.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.classList.remove('theme-switching');
    });
  });
}

export interface UseThemeResult {
  theme: Theme;
  toggle: () => void;
  setTheme: (next: Theme) => void;
}

/**
 * Read and toggle the current theme. Initial state is derived from
 * the DOM (the bootstrap script set it before hydration), so the
 * first React render matches what the user sees on first paint.
 */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Sync from the DOM on mount — the inline script may have flipped
  // the class before React attached.
  useEffect(() => {
    setThemeState(readCurrentTheme());
  }, []);

  // Track system preference changes for users who never toggled.
  // Once the user has an explicit choice (localStorage set), this
  // listener is a no-op visually because the toggle writes the
  // resolved value back, but we still re-derive so a user who
  // clears localStorage and changes their OS preference sees the
  // right default.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        /* ignore */
      }
      const next: Theme = mq.matches ? 'dark' : 'light';
      applyTheme(next);
      setThemeState(next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(readCurrentTheme() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, toggle, setTheme };
}

/**
 * Helper for non-React code paths (e.g. tests). Reads the current
 * theme from the DOM.
 */
export function getCurrentTheme(): Theme {
  return readCurrentTheme();
}
