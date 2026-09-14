'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 2px accent hairline along the top of the nav, scaled to scroll
 * depth. Lesson routes only — other pages have no long read.
 */
export function ReadingProgress() {
  const pathname = usePathname() ?? '';
  const isLesson = /^\/lessons\/[^/]+\/?$/.test(pathname);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLesson) return;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max <= 0 ? 0 : Math.min(1, el.scrollTop / max));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLesson]);

  if (!isLesson) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-border"
    >
      <div
        className="h-full origin-left bg-accent"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
