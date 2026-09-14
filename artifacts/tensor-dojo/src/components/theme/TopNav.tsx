

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

import clsx from 'clsx';
import { ThemeToggle } from './ThemeToggle';
import { useSearchPalette } from '@/components/search/SearchPalette';

interface NavLink {
  href: string;
  label: string;
  /** A route is "active" if the pathname starts with this prefix. */
  match: (path: string) => boolean;
}

const LINKS: readonly NavLink[] = [
  {
    href: '/lessons',
    label: 'Lessons',
    match: (p) => p === '/lessons' || p.startsWith('/lessons/'),
  },
  {
    href: '/map',
    label: 'Concept map',
    match: (p) => p === '/map',
  },
];

/**
 * Persistent top nav present on every page. Carries the wordmark
 * (links home), route links (Lessons, Concept map), and the theme
 * toggle. On mobile the route links collapse into a hamburger-opened
 * drawer; the wordmark and theme toggle stay visible.
 *
 * Sticky to the top of the viewport. The backdrop blur keeps prose
 * underneath legible without us having to track scroll position.
 */
export function TopNav() {
  const [pathname] = useLocation();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const search = useSearchPalette();
  // Show ⌘ on Mac, Ctrl on everything else. We can only detect this
  // on the client, so render a placeholder server-side and swap in
  // the right glyph after hydration.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.userAgent));
  }, []);
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus trap: when open, move focus into the drawer; when closed,
  // return focus to the toggle button. Tab/Shift+Tab cycle within.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      focusable[0]?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  const trapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-bg-elevated focus:text-ink focus:font-semibold focus:rounded-md focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-sm supports-[backdrop-filter]:bg-bg/60">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 rounded-sm text-[13px] font-mono text-ink hover:text-accent transition-colors"
            aria-label="Tensor Dojo — home"
          >
            <span aria-hidden="true" className="text-accent">◆</span>
            <span className="tracking-[0.04em] font-semibold">tensor dojo</span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-1"
          >
            {LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'focus-ring inline-flex h-9 items-center rounded-md px-3 text-[13px] font-mono transition-colors',
                    active
                      ? 'text-accent'
                      : 'text-fg-muted hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={search.open}
              aria-label="Search lessons"
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-mono text-fg-muted hover:text-ink transition-colors"
            >
              <DesktopSearchIcon />
              <span>Search</span>
              <kbd className="rounded border border-border px-1 py-0.5 text-[10px] text-fg-subtle tabular-nums">
                {modKey}K
              </kbd>
            </button>
            <span className="ml-2">
              <ThemeToggle />
            </span>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={search.open}
              aria-label="Search lessons"
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-ink hover:bg-bg-elevated-hover transition-colors"
            >
              <DesktopSearchIcon />
            </button>
            <ThemeToggle />
            <button
              ref={toggleRef}
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="top-nav-drawer"
              onClick={() => setOpen((o) => !o)}
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-ink hover:bg-bg-elevated-hover transition-colors"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          id="top-nav-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          onKeyDown={trapKeyDown}
          className="fixed inset-0 top-12 z-30 md:hidden bg-bg/95 backdrop-blur-md"
        >
          <nav
            aria-label="Primary"
            className="mx-auto flex max-w-[1500px] flex-col gap-1 px-4 py-4 sm:px-6"
          >
            {LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'focus-ring inline-flex min-h-[48px] items-center rounded-md px-3 text-[15px] font-mono transition-colors',
                    active
                      ? 'text-accent bg-accent-soft'
                      : 'text-ink hover:bg-bg-elevated-hover',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

function DesktopSearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="2.5" y1="5" x2="15.5" y2="5" />
      <line x1="2.5" y1="9" x2="15.5" y2="9" />
      <line x1="2.5" y1="13" x2="15.5" y2="13" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="14" y2="14" />
      <line x1="14" y1="4" x2="4" y2="14" />
    </svg>
  );
}
