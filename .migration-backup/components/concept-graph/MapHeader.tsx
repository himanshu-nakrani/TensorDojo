'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLastVisited } from '@/lib/progress/visits';

interface MapHeaderProps {
  /** Title to show for the "Start:" button (no visit history). */
  startTitle: string;
  /** Slug for the "Start:" target. */
  startSlug: string;
  /**
   * Title lookup table. The page (a server component) can pass a
   * plain object from the lesson manifest; the client doesn't
   * need a function (functions can't cross the RSC boundary).
   */
  titleBySlug: Record<string, string>;
}

/**
 * The header CTA above the track sections. Shows one of:
 *   - "Resume: {title}" if the reader has visited a lesson before
 *   - "Start: {title}" otherwise
 *
 * The state reads from localStorage on mount, then listens to the
 * `tld-visits-changed` event so it stays in sync if the lesson
 * page marks a visit in another tab or in the same tab before
 * navigation back to the map.
 */
export function MapHeader({ startTitle, startSlug, titleBySlug }: MapHeaderProps) {
  // Start with no resume; the server has no localStorage, and
  // reading it in the initializer would also cause a hydration
  // mismatch. useEffect populates the state on mount.
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const last = getLastVisited();
      setResumeSlug(last?.slug ?? null);
    };
    refresh();
    window.addEventListener('tld-visits-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tld-visits-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // The server can't read localStorage, so the first paint is the
  // "Start" state. Once we mount, if the reader has history, we
  // swap to "Resume". A one-line flicker is acceptable; the
  // alternative is rendering a placeholder and losing the link on
  // initial render.
  if (resumeSlug === null) {
    return (
      <ResumeButton
        prefix="Start"
        title={startTitle}
        slug={startSlug}
        variant="primary"
      />
    );
  }
  const title = titleBySlug[resumeSlug] ?? resumeSlug;
  return (
    <ResumeButton
      prefix="Resume"
      title={title}
      slug={resumeSlug}
      variant="primary"
    />
  );
}

function ResumeButton({
  prefix,
  title,
  slug,
  variant,
}: {
  prefix: 'Start' | 'Resume';
  title: string;
  slug: string;
  variant: 'primary';
}) {
  return (
    <Link
      href={`/lessons/${slug}`}
      data-cta={variant}
      className="focus-ring group inline-flex items-baseline gap-3 rounded-lg border border-accent bg-accent-soft px-5 py-4 transition-colors hover:border-accent hover:bg-accent-faint"
    >
      <span className="text-[11px] uppercase tracking-[0.12em] text-accent font-mono">
        {prefix}
      </span>
      <span className="text-[1.05rem] font-semibold text-ink tracking-[-0.005em]">
        {title}
      </span>
      <span
        aria-hidden="true"
        className="text-accent text-[1.1rem] leading-none transition-transform group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
