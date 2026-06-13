import { ReactNode } from 'react';
import clsx from 'clsx';

interface CalloutProps {
  /** Small label rendered in the top-left, in monospace caps. */
  title?: string;
  children: ReactNode;
  /** Visual variant. 'try' is the default and uses the accent. */
  variant?: 'try' | 'note';
  className?: string;
}

/**
 * Inline callout used to draw the reader's eye to a specific instruction.
 * The accent is reserved for "things the user can manipulate"; a callout
 * is itself an instruction, which is the closest static analog, so this
 * is one of the few non-control elements that uses the accent.
 */
export function Callout({
  title = 'Try this',
  children,
  variant = 'try',
  className,
}: CalloutProps) {
  return (
    <aside
      className={clsx(
        'my-6 rounded-md border-l-2 pl-5 pr-4 py-4',
        variant === 'try'
          ? 'border-accent bg-accent-faint'
          : 'border-border-strong bg-surface',
        className,
      )}
    >
      <div
        className={clsx(
          'text-[10px] uppercase tracking-[0.18em] font-mono mb-2',
          variant === 'try' ? 'text-accent' : 'text-muted',
        )}
      >
        {title}
      </div>
      <div className="text-ink text-[0.95rem] leading-relaxed [&>p]:m-0">
        {children}
      </div>
    </aside>
  );
}
