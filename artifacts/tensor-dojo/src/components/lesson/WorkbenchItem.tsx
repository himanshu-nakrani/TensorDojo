

import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import clsx from 'clsx';

interface WorkbenchItemProps {
  id: string;
  title: string;
  description?: string;
  caption?: string;
  isActive: boolean;
  onToggle: () => void;
  /** Bumping this triggers a pulse animation on the item. */
  pulseKey: number | null;
  /** 1-based figure number rendered in the panel header (`FIG. 03`). */
  figNumber?: number;
  children: ReactNode;
}

/**
 * Accordion-style workbench item. Header is a real disclosure button:
 * clicking the inactive item opens it (the workbench collapses any
 * sibling), and clicking the active item closes it. `aria-expanded`
 * and `aria-controls` are wired to the panel below.
 */
export const WorkbenchItem = forwardRef<HTMLDivElement, WorkbenchItemProps>(
  function WorkbenchItem(
    {
      id,
      title,
      description,
      caption,
      isActive,
      onToggle,
      pulseKey,
      figNumber,
      children,
    },
    ref,
  ) {
    const [pulsing, setPulsing] = useState(false);
    const panelId = useId();

    useEffect(() => {
      if (pulseKey == null) return;
      setPulsing(true);
      const t = window.setTimeout(() => setPulsing(false), 1200);
      return () => window.clearTimeout(t);
    }, [pulseKey]);

    return (
      <div
        ref={ref}
        data-interactive-id={id}
        className={clsx(
          'relative rounded-lg border bg-surface transition-shadow shadow-card',
          isActive ? 'border-accent/70' : 'border-border',
          pulsing && 'animate-pulse-ring',
        )}
      >
        {/* status LED strip on the active panel */}
        <span
          aria-hidden="true"
          className={clsx(
            'absolute left-0 top-0 h-full w-[2px] rounded-l-lg transition-colors',
            isActive ? 'bg-accent' : 'bg-transparent',
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isActive}
          aria-controls={panelId}
          className="focus-ring w-full px-5 py-4 flex items-center gap-4 text-left rounded-lg"
        >
          <Chevron open={isActive} />
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-dim font-mono">
              {figNumber !== undefined && (
                <span className={isActive ? 'text-accent' : undefined}>
                  Fig. {String(figNumber).padStart(2, '0')}
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span>{isActive ? 'Live' : 'Interactive'}</span>
            </span>
            <span className="block text-sm font-semibold text-ink tracking-[-0.005em]">
              {title}
            </span>
            {description && (
              <span className="block text-[13px] text-muted mt-0.5">
                {description}
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            title={isActive ? 'Active' : 'Idle'}
            className={clsx(
              'shrink-0 h-1.5 w-1.5 rounded-full',
              isActive ? 'bg-accent shadow-[0_0_6px_var(--accent-shadow)]' : 'bg-border-strong',
            )}
          />
        </button>

        {isActive && (
          <div
            id={panelId}
            role="region"
            aria-label={`${title} — workspace`}
            className="px-5 pb-5 pt-1 border-t border-border"
          >
            {children}
            {caption && (
              <p className="mt-4 text-[12px] text-dim font-mono leading-relaxed border-t border-border pt-3">
                {caption}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={clsx(
        'shrink-0 transition-transform motion-reduce:transition-none',
        open ? 'rotate-90 text-accent' : 'text-dim',
      )}
    >
      <path
        d="M4 2 L8 6 L4 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
