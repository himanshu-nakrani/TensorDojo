'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLesson, prevNext } from '@/lib/lessons';

interface PrevNextProps {
  slug: string;
}

/**
 * Renders a single-line "← prev | next →" navigation row at the
 * bottom of every lesson. Left/right arrow keys also navigate when
 * no input is focused.
 */
export function PrevNext({ slug }: PrevNextProps) {
  const router = useRouter();
  const { prev, next } = prevNext(slug);
  const prevMeta = prev ? getLesson(prev)?.meta : undefined;
  const nextMeta = next ? getLesson(next)?.meta : undefined;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only navigate if no input/textarea/contenteditable is focused.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
          return;
        }
      }
      if (e.key === 'ArrowLeft' && prev) {
        router.push(`/lessons/${prev}`);
      } else if (e.key === 'ArrowRight' && next) {
        router.push(`/lessons/${next}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, router]);

  if (!prevMeta && !nextMeta) return null;

  return (
    <nav
      aria-label="Lesson navigation"
      className="mt-12 pt-6 border-t border-border"
    >
      <div className="flex items-center justify-between gap-4 font-mono text-[12px]">
        {prevMeta ? (
          <Link
            href={`/lessons/${prevMeta.slug}`}
            className="group flex items-center gap-2 text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:text-accent min-w-0 rounded-sm"
          >
            <span
              aria-hidden="true"
              className="text-dim group-hover:-translate-x-0.5 transition-transform shrink-0"
            >
              ←
            </span>
            <span className="truncate">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim block">Previous</span>
              {prevMeta.title}
            </span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        {nextMeta ? (
          <Link
            href={`/lessons/${nextMeta.slug}`}
            className="group flex items-center gap-2 text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:text-accent min-w-0 rounded-sm text-right"
          >
            <span className="truncate">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim block">Next</span>
              {nextMeta.title}
            </span>
            <span
              aria-hidden="true"
              className="text-dim group-hover:translate-x-0.5 transition-transform shrink-0"
            >
              →
            </span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
