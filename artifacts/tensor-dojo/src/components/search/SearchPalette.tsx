
import { useLocation } from 'wouter';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Command } from 'cmdk';
import { listLessonMeta, TRACKS, trackForSlug } from '@/lib/lessons-meta';

/**
 * Global Cmd-K command palette.
 *
 * Lives once at the root layout. Owns its own open state. Listens for
 * Cmd-K (Mac) / Ctrl-K (other) globally and toggles the palette. Indexes
 * every lesson's title + summary + track label client-side — the whole
 * payload is ~10 KB so there is no need for an async/loader.
 *
 * To open from a button (e.g. TopNav), wrap children in the
 * `<SearchPaletteProvider>` and call `useSearchPalette().open()`.
 */

interface SearchContextValue {
  open: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchPalette(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    // Allow components that may render outside the provider (e.g.
    // a stray header on the 404 page) to call open() as a no-op.
    return { open: () => {} };
  }
  return ctx;
}

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  

  // Pre-compute the full lesson index once. Stable across renders.
  const [, navigate] = useLocation();
  const items = useMemo(() => {
    return listLessonMeta().map(({ meta }) => {
      const track = trackForSlug(meta.slug);
      return {
        slug: meta.slug,
        title: meta.title,
        summary: meta.summary,
        minutes: meta.minutes,
        trackId: track?.id ?? '',
        trackLabel: track?.label ?? '',
      };
    });
  }, []);

  // Cmd/Ctrl + K toggles the palette globally. Skip if focus is in an
  // editable element — let the user use Cmd-K natively (e.g. in the
  // address bar of the matmul number inputs).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'k' && e.key !== 'K') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // Don't preempt browser shortcuts the user might want (e.g. dev
      // tools): only handle the bare Cmd/Ctrl + K case.
      if (e.altKey || e.shiftKey) return;
      e.preventDefault();
      setIsOpen((o) => !o);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const ctxValue = useMemo<SearchContextValue>(() => ({ open }), [open]);

  const go = useCallback(
    (slug: string) => {
      close();
      navigate(`/lessons/${slug}`);
    },
    [navigate, close],
  );

  // Group lessons by track for visual grouping in the list. The order
  // mirrors the TRACKS reading order so navigating by section feels
  // continuous with the lessons page.
  const grouped = useMemo(() => {
    return TRACKS.map((track) => ({
      track,
      items: items.filter((i) => i.trackId === track.id),
    })).filter((g) => g.items.length > 0);
  }, [items]);

  return (
    <SearchContext.Provider value={ctxValue}>
      {children}
      {isOpen && (
        <PaletteOverlay
          onClose={close}
          grouped={grouped}
          onSelect={go}
        />
      )}
    </SearchContext.Provider>
  );
}

interface GroupedItem {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  trackId: string;
  trackLabel: string;
}

interface Grouped {
  track: (typeof TRACKS)[number];
  items: GroupedItem[];
}

function PaletteOverlay({
  onClose,
  grouped,
  onSelect,
}: {
  onClose: () => void;
  grouped: Grouped[];
  onSelect: (slug: string) => void;
}) {
  // Lock body scroll while the palette is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      // Backdrop. Click anywhere outside the panel to close.
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 backdrop-blur-sm pt-[12vh] px-4"
    >
      <div
        // The panel itself absorbs clicks so they don't bubble to the
        // backdrop.
        role="dialog"
        aria-modal="true"
        aria-label="Search lessons"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] rounded-xl border border-border-strong bg-bg-elevated shadow-xl overflow-hidden"
      >
        <Command
          label="Search lessons"
          loop
          // We do our own filter: cmdk's default scoring puts perfect
          // prefix matches above substring matches, which is what we
          // want.
          shouldFilter
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <SearchIcon />
            <Command.Input
              autoFocus
              placeholder="Search 58 lessons by title, summary, or track…"
              className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-fg-subtle focus:outline-none"
            />
            <kbd className="hidden sm:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-fg-muted">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="px-4 py-8 text-center text-[13px] font-mono text-fg-muted">
              No lessons match.
            </Command.Empty>
            {grouped.map(({ track, items }) => (
              <Command.Group
                key={track.id}
                heading={track.label}
                className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-dim [&_[cmdk-group-heading]]:font-mono"
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.slug}
                    // The full searchable string. cmdk uses this for filtering.
                    value={`${item.title} ${item.summary} ${item.trackLabel}`}
                    onSelect={() => onSelect(item.slug)}
                    className="group flex flex-col gap-0.5 rounded-md px-3 py-2 cursor-pointer data-[selected=true]:bg-accent-soft data-[selected=true]:text-ink"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] text-ink font-medium leading-tight">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-fg-subtle shrink-0 tabular-nums">
                        {item.minutes} min
                      </span>
                    </div>
                    <span className="text-[12px] text-fg-muted leading-snug line-clamp-2">
                      {item.summary}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] font-mono text-fg-subtle">
            <div className="flex items-center gap-3">
              <Hint icon="↵">open</Hint>
              <Hint icon="↑↓">navigate</Hint>
            </div>
            <span>{grouped.reduce((n, g) => n + g.items.length, 0)} lessons</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function Hint({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-muted">
        {icon}
      </kbd>
      <span>{children}</span>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-fg-subtle"
    >
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}
