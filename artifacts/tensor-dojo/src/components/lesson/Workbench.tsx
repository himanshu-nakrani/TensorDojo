

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
} from 'react';
import clsx from 'clsx';
import { WorkbenchItem } from './WorkbenchItem';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/**
 * A registered interactive in the workbench.
 */
export interface InteractiveEntry {
  id: string;
  title: string;
  description?: string;
  /**
   * One-line caption shown under the figure, answering "what am I
   * looking at" + "what should I try first." This is the prose
   * anchor the reader is meant to glance at when the figure is
   * open in the workbench.
   */
  caption?: string;
  /** The React component that renders the interactive. */
  Component: ComponentType;
  /**
   * If true, the interactive spans the full page width below the
   * prose (and any narrow interactives are pushed into a sub-grid
   * below it). Default false — inter-actives share the standard
   * 720/440 two-column workbench. The capstone uses a `wide`
   * centerpiece because the data-flow view doesn't degrade to
   * 440px.
   */
  wide?: boolean;
}

export interface WorkbenchContextValue {
  /**
   * Expand the named interactive, pulse it, and scroll it into view.
   * Used by prose-side "Open in workbench" callouts on wide viewports.
   */
  focusInteractive: (id: string) => void;
  /**
   * Look up a registered interactive by id. Used by the Callout
   * inline-preview path on narrow viewports, where scrolling to the
   * bottom-stacked workbench would lose the reader's place. Returns
   * undefined if the id is not registered.
   */
  getInteractive: (id: string) => InteractiveEntry | undefined;
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

/** Hook for descendants of <Workbench> to control the workbench. */
export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) {
    throw new Error('useWorkbench must be used inside <Workbench>');
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Workbench
// -----------------------------------------------------------------------------

interface WorkbenchProps {
  interactives: readonly InteractiveEntry[];
  defaultActive: string;
  /** The lesson body (prose). Rendered in the left column. */
  prose: ReactNode;
}

export function Workbench({
  interactives,
  defaultActive,
  prose,
}: WorkbenchProps) {
  // `defaultActive` is passed from the server page (loads via
  // `loadLessonInteractives`), but client-marked interactives modules
  // come back as opaque references on the server boundary, so the
  // server-derived `interactives[0]?.id` may be `''`. Fall back to the
  // first id we can see *as a client*. This means the initial
  // expanded item is correct both during SSR (where defaultActive
  // happens to round-trip) and on first client render.
  const [active, setActive] = useState<string>(
    defaultActive || interactives[0]?.id || '',
  );
  const [pulse, setPulse] = useState<{ id: string; version: number } | null>(
    null,
  );
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const focusInteractive = useCallback((id: string) => {
    setActive(id);
    // Allow the accordion to expand, then scroll into view and pulse
    // *after* the scroll resolves so the eye lands on a fresh ring
    // rather than one mid-decay.
    setTimeout(() => {
      const el = refs.current[id];
      if (!el) {
        setPulse({ id, version: Date.now() });
        return;
      }
      const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'center',
      });

      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        setPulse({ id, version: Date.now() });
      };
      if (typeof IntersectionObserver === 'function') {
        const io = new IntersectionObserver(
          (entries) => {
            const e = entries[0];
            if (e && e.intersectionRatio > 0.6) {
              io.disconnect();
              fire();
            }
          },
          { threshold: [0, 0.6, 1] },
        );
        io.observe(el);
        // Fallback if the scroll never resolves (reduced motion etc).
        window.setTimeout(() => {
          io.disconnect();
          fire();
        }, 800);
      } else {
        window.setTimeout(fire, 350);
      }
    }, 60);
  }, []);

  const toggleInteractive = useCallback((id: string) => {
    setActive((prev) => (prev === id ? '' : id));
  }, []);

  const interactiveById = useMemo(() => {
    const m = new Map<string, InteractiveEntry>();
    for (const i of interactives) m.set(i.id, i);
    return m;
  }, [interactives]);

  const getInteractive = useCallback(
    (id: string) => interactiveById.get(id),
    [interactiveById],
  );

  const ctxValue = useMemo<WorkbenchContextValue>(
    () => ({ focusInteractive, getInteractive }),
    [focusInteractive, getInteractive],
  );

  return (
    <WorkbenchContext.Provider value={ctxValue}>
      {hasWide(interactives) ? (
        <WideLayout
          prose={prose}
          interactives={interactives}
          active={active}
          pulse={pulse}
          refs={refs}
          focusInteractive={focusInteractive}
          toggleInteractive={toggleInteractive}
        />
      ) : (
        <DefaultLayout
          prose={prose}
          interactives={interactives}
          active={active}
          pulse={pulse}
          refs={refs}
          focusInteractive={focusInteractive}
          toggleInteractive={toggleInteractive}
        />
      )}
    </WorkbenchContext.Provider>
  );
}

function hasWide(
  interactives: readonly InteractiveEntry[],
): boolean {
  return interactives.some((i) => i.wide);
}

interface LayoutProps {
  prose: ReactNode;
  interactives: readonly InteractiveEntry[];
  active: string;
  pulse: { id: string; version: number } | null;
  refs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  focusInteractive: (id: string) => void;
  toggleInteractive: (id: string) => void;
}

/** Standard two-column layout: prose left, workbench right. */
function DefaultLayout({
  prose,
  interactives,
  active,
  pulse,
  refs,
  focusInteractive,
  toggleInteractive,
}: LayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_minmax(0,440px)] gap-x-10 gap-y-10">
      {/* Left: prose */}
      <div className="min-w-0 lesson-body">{prose}</div>

      {/* Right: workbench — sticky on desktop. No interior scroll;
          we want the page scroll, not a nested one. */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-16 lg:self-start">
        {interactives.map((entry) => (
          <Item
            key={entry.id}
            entry={entry}
            active={active}
            pulse={pulse}
            refs={refs}
            focusInteractive={focusInteractive}
            toggleInteractive={toggleInteractive}
          />
        ))}
      </aside>
    </div>
  );
}

/**
 * Wide-capable layout: renders prose on top, wide interactives
 * full-width below, and any remaining narrow interactives in a
 * 720/440 sub-grid beneath that. The layout collapses to a single
 * column below `lg`.
 */
function WideLayout({
  prose,
  interactives,
  active,
  pulse,
  refs,
  focusInteractive,
  toggleInteractive,
}: LayoutProps) {
  const wideItems = interactives.filter((i) => i.wide);
  const narrowItems = interactives.filter((i) => !i.wide);
  return (
    <div className="flex flex-col gap-10">
      <div className="lesson-body max-w-prose">{prose}</div>
      <div className="space-y-4">
        {wideItems.map((entry) => (
          <Item
            key={entry.id}
            entry={entry}
            active={active}
            pulse={pulse}
            refs={refs}
            focusInteractive={focusInteractive}
            toggleInteractive={toggleInteractive}
          />
        ))}
      </div>
      {narrowItems.length > 0 && (
        <div className="mx-auto w-full max-w-[720px] space-y-4">
          {narrowItems.map((entry) => (
            <Item
              key={entry.id}
              entry={entry}
              active={active}
              pulse={pulse}
              refs={refs}
              focusInteractive={focusInteractive}
              toggleInteractive={toggleInteractive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({
  entry,
  active,
  pulse,
  refs,
  toggleInteractive,
}: {
  entry: InteractiveEntry;
  active: string;
  pulse: { id: string; version: number } | null;
  refs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  focusInteractive: (id: string) => void;
  toggleInteractive: (id: string) => void;
}) {
  const isActive = active === entry.id;
  const ItemComponent = entry.Component;
  return (
    <WorkbenchItem
      key={entry.id}
      id={entry.id}
      title={entry.title}
      description={entry.description}
      caption={entry.caption}
      isActive={isActive}
      onToggle={() => toggleInteractive(entry.id)}
      pulseKey={pulse?.id === entry.id ? pulse.version : null}
      ref={(el) => {
        refs.current[entry.id] = el;
      }}
    >
      <ItemComponent />
    </WorkbenchItem>
  );
}
