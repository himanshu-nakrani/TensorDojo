'use client';

import { useEffect, useState } from 'react';
import { getLastVisited } from './visits';

/**
 * Last-visited lesson slug from localStorage, kept live via the
 * `tld-visits-changed` CustomEvent and the cross-tab `storage`
 * event. `null` until mount (localStorage is unavailable during SSR
 * and the first client render matches that).
 */
export function useLastVisited(): string | null {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSlug(getLastVisited()?.slug ?? null);
    };
    refresh();
    window.addEventListener('tld-visits-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tld-visits-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return slug;
}
