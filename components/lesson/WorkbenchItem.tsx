'use client';

import {
  forwardRef,
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';

interface WorkbenchItemProps {
  id: string;
  title: string;
  description?: string;
  caption?: string;
  isActive: boolean;
  onActivate: () => void;
  /** Bumping this triggers a 600ms pulse animation on the item. */
  pulseKey: number | null;
  children: ReactNode;
}

/**
 * Accordion-style workbench item. Renders a clickable header that
 * activates the item, and an expanded body. Pulse animation runs for
 * 600ms whenever `pulseKey` changes (driven by the workbench).
 */
export const WorkbenchItem = forwardRef<HTMLDivElement, WorkbenchItemProps>(
  function WorkbenchItem(
    {
      id,
      title,
      description,
      caption,
      isActive,
      onActivate,
      pulseKey,
      children,
    },
    ref,
  ) {
    const [pulsing, setPulsing] = useState(false);

    useEffect(() => {
      if (pulseKey == null) return;
      setPulsing(true);
      const t = window.setTimeout(() => setPulsing(false), 600);
      return () => window.clearTimeout(t);
    }, [pulseKey]);

    const onHeaderKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    };

    return (
      <div
        ref={ref}
        data-interactive-id={id}
        className={clsx(
          'rounded-xl border bg-surface transition-shadow',
          isActive ? 'border-border-strong' : 'border-border',
          pulsing && 'animate-pulse-ring',
        )}
      >
        <button
          type="button"
          onClick={onActivate}
          onKeyDown={onHeaderKeyDown}
          aria-expanded={isActive}
          className="w-full px-5 py-4 flex items-center gap-4 text-left rounded-xl"
        >
          <span
            className={clsx(
              'inline-block transition-transform',
              isActive ? 'rotate-90 text-accent' : 'text-dim',
            )}
            aria-hidden="true"
          >
            ▸
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
              Interactive
            </span>
            <span className="block text-sm font-semibold text-ink tracking-[-0.005em]">
              {title}
            </span>
            {description && (
              <span className="block text-[12px] text-muted mt-0.5">
                {description}
              </span>
            )}
          </span>
        </button>

        {isActive && (
          <div className="px-5 pb-5 pt-1 border-t border-border">
            {children}
            {caption && (
              <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed border-t border-border pt-3">
                {caption}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);
