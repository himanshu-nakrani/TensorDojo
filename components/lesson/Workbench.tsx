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

/** A registered interactive in the workbench. */
export interface InteractiveEntry {
  id: string;
  title: string;
  description?: string;
  /** The React component that renders the interactive. */
  Component: ComponentType;
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
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_minmax(0,440px)] gap-x-10 gap-y-10">
        {/* Left: prose */}
        <div className="min-w-0 lesson-body">{prose}</div>

        {/* Right: workbench — sticky on desktop */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1">
          {interactives.map((entry) => {
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
          })}
        </aside>
      </div>
    </WorkbenchContext.Provider>
  );
}
