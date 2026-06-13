'use client';

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
   * Used by prose-side "Open in workbench" callouts.
   */
  focusInteractive: (id: string) => void;
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
  const [active, setActive] = useState<string>(defaultActive);
  const [pulse, setPulse] = useState<{ id: string; version: number } | null>(
    null,
  );
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const focusInteractive = useCallback((id: string) => {
    setActive(id);
    // Bumping the version re-triggers the pulse animation in WorkbenchItem.
    setPulse({ id, version: Date.now() });
    // Allow the accordion to expand before scrolling.
    setTimeout(() => {
      const el = refs.current[id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, []);

  const ctxValue = useMemo<WorkbenchContextValue>(
    () => ({ focusInteractive }),
    [focusInteractive],
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
        />
      ) : (
        <DefaultLayout
          prose={prose}
          interactives={interactives}
          active={active}
          pulse={pulse}
          refs={refs}
          focusInteractive={focusInteractive}
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
}

/** Standard two-column layout: prose left, workbench right. */
function DefaultLayout({
  prose,
  interactives,
  active,
  pulse,
  refs,
  focusInteractive,
}: LayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_minmax(0,440px)] gap-x-10 gap-y-10">
      {/* Left: prose */}
      <div className="min-w-0 lesson-body">{prose}</div>

      {/* Right: workbench — sticky on desktop */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1">
        {interactives.map((entry) => (
          <Item
            key={entry.id}
            entry={entry}
            active={active}
            pulse={pulse}
            refs={refs}
            focusInteractive={focusInteractive}
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
          />
        ))}
      </div>
      {narrowItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_minmax(0,440px)] gap-x-10 gap-y-10">
          <div className="min-w-0" />
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1">
            {narrowItems.map((entry) => (
              <Item
                key={entry.id}
                entry={entry}
                active={active}
                pulse={pulse}
                refs={refs}
                focusInteractive={focusInteractive}
              />
            ))}
          </aside>
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
  focusInteractive,
}: {
  entry: InteractiveEntry;
  active: string;
  pulse: { id: string; version: number } | null;
  refs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  focusInteractive: (id: string) => void;
}) {
  const isActive = active === entry.id;
  const ItemComponent = entry.Component;
  return (
    <WorkbenchItem
      key={entry.id}
      id={entry.id}
      title={entry.title}
      description={entry.description}
      isActive={isActive}
      onActivate={() => focusInteractive(entry.id)}
      pulseKey={pulse?.id === entry.id ? pulse.version : null}
      ref={(el) => {
        refs.current[entry.id] = el;
      }}
    >
      <ItemComponent />
    </WorkbenchItem>
  );
}
