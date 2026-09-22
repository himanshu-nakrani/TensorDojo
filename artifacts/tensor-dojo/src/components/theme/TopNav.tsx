import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

import clsx from 'clsx';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { useSearchPalette } from '@/components/search/SearchPalette';
import { useCompletions } from '@/hooks/use-completions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TRACKS,
  getLessonMeta,
  prevNext,
  readingOrder,
  trackForSlug,
} from '@/lib/lessons-meta';
import { track } from '@/lib/analytics';
import { markCompleted, markIncomplete } from '@/lib/progress/completion';
import { trackColor } from '@/lib/track-color';

interface NavLink {
  href: string;
  label: string;
  /** A route is "active" if the pathname starts with this prefix. */
  match: (path: string) => boolean;
}

const LINKS: readonly NavLink[] = [
  {
    href: "/lessons",
    label: "Lessons",
    match: (p) => p === "/lessons" || p.startsWith("/lessons/"),
  },
  {
    href: "/map",
    label: "Concept map",
    match: (p) => p === "/map",
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
  const { count } = useCompletions();
  const order = useMemo(() => readingOrder(), []);
  const total = order.length;
  const onLesson = pathname.startsWith('/lessons/');
  const lessonSlug = onLesson ? pathname.slice('/lessons/'.length) : '';
  // Index comes from readingOrder() — the same sequence prevNext()
  // walks — so the "NN/80" readout and the ← → arrows never disagree.
  const lessonIndex = lessonSlug ? order.indexOf(lessonSlug) : -1;
  const lessonMeta = useMemo(
    () => (lessonSlug ? getLessonMeta(lessonSlug) : undefined),
    [lessonSlug],
  );
  const lessonNav = useMemo(
    () => (lessonSlug ? prevNext(lessonSlug) : { prev: undefined, next: undefined }),
    [lessonSlug],
  );
  const [progress, setProgress] = useState(0);

  // Reading progress on lesson routes: fraction of the document
  // scrolled, mapped onto the thin accent bar under the header.
  useEffect(() => {
    if (!onLesson) {
      setProgress(0);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (raf === 0) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf !== 0) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onLesson, pathname]);
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
  const modKey = isMac ? "⌘" : "Ctrl";

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
        "a[href], button:not([disabled])",
      );
      focusable[0]?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  const trapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
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
      {/* Solid, not translucent: over dense lesson content a blurred
          semi-transparent bar picks up the shapes behind it (dark code
          blocks read as a floating slab) and costs a backdrop-filter
          paint on every scroll frame. */}
      <header className="no-print sticky top-0 z-40 border-b border-border/60 bg-bg">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 rounded-sm text-[13px] font-mono text-ink hover:text-accent-2 transition-colors"
            aria-label="Tensor Dojo — home"
          >
             <Logo size={17} className="text-ink shrink-0" />
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
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    'focus-ring relative inline-flex h-9 items-center rounded-md px-3 text-[13px] font-mono transition-colors',
                    "after:absolute after:left-3 after:right-3 after:bottom-1 after:h-px after:origin-left after:bg-accent-2 after:transition-transform after:duration-200 motion-reduce:after:transition-none",
                    active
                      ? 'text-accent-2 after:scale-x-100'
                      : 'text-fg-muted hover:text-ink after:scale-x-0 hover:after:scale-x-100',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                track('search_open', { source: 'topnav' });
                search.open();
              }}
              aria-label="Search lessons"
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-mono text-fg-muted hover:text-ink transition-colors"
            >
              <DesktopSearchIcon />
              <span>Search</span>
              <kbd className="rounded border border-border px-1 py-0.5 text-[10px] text-fg-subtle tabular-nums">
                {modKey}K
              </kbd>
            </button>
            {count > 0 && <ProgressRing count={count} total={total} />}
            <span className="ml-2">
              <ThemeToggle />
            </span>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            {count > 0 && <ProgressRing count={count} total={total} compact />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    track('search_open', { source: 'topnav-mobile' });
                    search.open();
                  }}
                  aria-label="Search lessons"
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-ink hover:bg-bg-elevated-hover transition-colors"
                >
                  <DesktopSearchIcon />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Search lessons</p>
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={toggleRef}
                  type="button"
                  aria-label={open ? "Close menu" : "Open menu"}
                  aria-expanded={open}
                  aria-controls="top-nav-drawer"
                  onClick={() => setOpen((o) => !o)}
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-ink hover:bg-bg-elevated-hover transition-colors"
                >
                  {open ? <CloseIcon /> : <MenuIcon />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{open ? "Close menu" : "Open menu"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {onLesson && lessonMeta && (
          <LessonContextBar
            index={lessonIndex}
            total={total}
            trackLabel={trackForSlug(lessonSlug)?.label}
            trackIdx={
              TRACKS.findIndex((t) => t.id === trackForSlug(lessonSlug)?.id)
            }
            slug={lessonSlug}
            title={lessonMeta.meta.title}
            prev={lessonNav.prev}
            next={lessonNav.next}
          />
        )}
        {onLesson && progress > 0 && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
          >
            <div
              className="reading-progress h-full w-full"
              style={{ '--progress': progress } as CSSProperties}
            />
          </div>
        )}
      </header>

      {open && (
        <div
          id="top-nav-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          onKeyDown={trapKeyDown}
          className={clsx(
            'fixed inset-0 z-30 md:hidden bg-bg/95 backdrop-blur-md',
            // The sticky header grows a context tier on lesson routes;
            // the drawer must start below the whole header, not below
            // the brand row, or the context bar overlays its top.
            onLesson && lessonMeta ? 'top-[84px]' : 'top-12',
          )}
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
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "focus-ring inline-flex min-h-[48px] items-center rounded-md px-3 text-[15px] font-mono transition-colors",
                    active
                      ? 'text-accent-2 bg-accent-2-soft'
                      : 'text-ink hover:bg-bg-elevated-hover',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {count > 0 && (
              <div className="mt-3 border-t border-border pt-3 px-3 text-[12px] font-mono text-fg-muted tabular-nums">
                {count} / {total} lessons complete
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

/**
 * Second header tier on lesson routes: track, position in the
 * curriculum, lesson title, and prev/next jumps — the instrument's
 * status row. Keeps readers oriented without scrolling to PrevNext.
 */
function LessonContextBar({
  index,
  total,
  trackLabel,
  trackIdx,
  slug,
  title,
  prev,
  next,
}: {
  index: number;
  total: number;
  trackLabel?: string;
  /** Index into TRACKS for the data hue dot; -1 when unknown. */
  trackIdx?: number;
  slug: string;
  title: string;
  prev?: string;
  next?: string;
}) {
  const { set: completedSet } = useCompletions();
  const done = completedSet.has(slug);
  const toggleComplete = () => {
    if (done) markIncomplete(slug);
    else markCompleted(slug);
  };
  return (
    <div className="border-t border-border/60">
      <div className="mx-auto flex h-9 max-w-[1500px] items-center gap-3 px-4 sm:px-6 font-mono text-[11px]">
        {trackLabel && (
          <span className="flex items-center gap-1.5 uppercase tracking-[0.14em] text-accent-2 truncate max-w-[38vw] sm:max-w-none">
            {(trackIdx ?? -1) >= 0 && (
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: trackColor(trackIdx!) }}
              />
            )}
            <span className="truncate">{trackLabel}</span>
          </span>
        )}
        <span className="text-fg-subtle tabular-nums shrink-0">
          {String(index + 1).padStart(2, '0')}/{total}
        </span>
        <span className="hidden md:block text-fg-muted truncate">{title}</span>
        <span className="ml-auto flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleComplete}
                aria-pressed={done}
                aria-label={done ? 'Undo completion' : 'Complete this lesson'}
                className={clsx(
                  'focus-ring mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors',
                  done
                    ? 'border-accent-2 bg-accent-2 text-accent-2-fg'
                    : 'border-border-strong text-transparent hover:border-accent-2 hover:text-accent-2',
                )}
              >
                ✓
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{done ? 'Completed — undo' : 'Complete this lesson'}</p>
            </TooltipContent>
          </Tooltip>
          {prev ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/lessons/${prev}`}
                  aria-label="Previous lesson"
                  className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border text-fg-muted hover:border-accent-2 hover:text-accent-2 transition-colors"
                >
                  ←
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Previous lesson</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center text-border-strong">←</span>
          )}
          {next ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/lessons/${next}`}
                  aria-label="Next lesson"
                  className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border text-fg-muted hover:border-accent-2 hover:text-accent-2 transition-colors"
                >
                  →
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Next lesson</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center text-border-strong">→</span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Completion progress ring — appears in the nav once the reader has
 * completed at least one lesson. Links to /lessons where the full
 * per-track progress lives.
 */
function ProgressRing({
  count,
  total,
  compact,
}: {
  count: number;
  total: number;
  compact?: boolean;
}) {
  const frac = total > 0 ? Math.min(1, count / total) : 0;
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/lessons"
          aria-label={`${count} of ${total} lessons complete — see all progress`}
          className={clsx(
            'focus-ring inline-flex items-center gap-1.5 rounded-md transition-colors',
            compact ? 'h-11 px-2' : 'h-9 ml-1 px-2',
          )}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="rgb(var(--border-strong))"
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="rgb(var(--accent-2))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${(frac * c).toFixed(2)} ${c.toFixed(2)}`}
          transform="rotate(-90 10 10)"
        />
      </svg>
      <span className="hidden lg:inline text-[11px] font-mono text-fg-muted tabular-nums">
        {count}/{total}
      </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{count}/{total} complete</p>
      </TooltipContent>
    </Tooltip>
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
