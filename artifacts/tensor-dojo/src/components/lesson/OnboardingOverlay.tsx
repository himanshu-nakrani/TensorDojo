import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@/lib/analytics';

const STORAGE_KEY = 'tld-onboarded';

function alreadyOnboarded(): boolean {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private mode: treat as onboarded so we never trap a reader who
    // can't persist the dismissal.
    return true;
  }
}

/**
 * One-time "how the dojo works" card, shown only on the first lesson
 * (dot-product) for first-time visitors.
 *
 * Modal hygiene: opens synchronously (no delayed focus steal mid-drag),
 * portals to <body> so the page behind can be marked `inert`, locks
 * body scroll, traps Tab, closes on Escape, and restores focus to
 * whatever held it before the dialog opened.
 */
export function OnboardingOverlay() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !alreadyOnboarded();
  });
  const [modKey, setModKey] = useState('⌘');
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // ⌘ on Mac, Ctrl everywhere else — same detection as TopNav, so the
  // shortcut we teach is the shortcut the nav shows.
  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) setModKey('⌘');
    else setModKey('Ctrl');
  }, []);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    // Inert everything else (the app tree, nav, sims): screen readers
    // and Tab skip the lesson behind the modal entirely. The dialog's
    // own portal wrapper is excluded.
    const others = Array.from(document.body.children).filter(
      (el) => el !== wrapperRef.current,
    );
    for (const el of others) el.setAttribute('inert', '');

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
        return;
      }
      if (e.key === 'Tab' && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href]',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      for (const el of others) el.removeAttribute('inert');
      restoreRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* private mode — show again next visit, harmless */
    }
    track('onboarding_dismiss');
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center sm:p-6"
      onClick={dismiss}
      role="presentation"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onClick={(e) => e.stopPropagation()}
        className="lab-note w-full max-w-md p-6 shadow-pop animate-fade-up"
      >
        <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-accent-2 mb-2">
          Welcome to the dojo
        </p>
        <h2
          id="onboarding-title"
          className="lab-display text-[1.4rem] text-ink leading-snug mb-4"
        >
          Nothing here is a picture.
        </h2>
        <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-fg-muted">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="font-mono text-accent-2 shrink-0">01</span>
            <span>
              <strong className="text-ink font-semibold">Drag the figure</strong>{' '}
              on the right — the vector tips, sliders, and cells are the
              lesson, not decoration.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="font-mono text-accent-2 shrink-0">02</span>
            <span>
              <strong className="text-ink font-semibold">Read the math</strong>{' '}
              underneath. Every formula updates from the same state you are
              manipulating.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="font-mono text-accent-2 shrink-0">03</span>
            <span>
              Navigate with <kbd className="rounded border border-border-strong bg-bg-code px-1 font-mono text-[11px]">←</kbd>{' '}
              <kbd className="rounded border border-border-strong bg-bg-code px-1 font-mono text-[11px]">→</kbd>,
              jump anywhere with{' '}
              <kbd className="rounded border border-border-strong bg-bg-code px-1 font-mono text-[11px]">{modKey}K</kbd>.
              Progress is saved in your browser — no account.
            </span>
          </li>
        </ul>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-fg-subtle">Shown once</span>
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            className="focus-ring inline-flex min-h-[44px] items-center rounded-md bg-accent-2 px-5 py-2 text-[13px] font-semibold text-accent-2-fg transition-colors hover:bg-accent-2-hover"
          >
            Start dragging
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
