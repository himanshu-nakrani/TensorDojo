import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import clsx from 'clsx';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms. Default 0. */
  delay?: number;
  className?: string;
  /** Rendered element. Default 'div'. */
  as?: ElementType;
}

/**
 * Scroll-triggered fade-up. Adds `.reveal-in` the first time the
 * element intersects the viewport; the CSS (.reveal / .reveal-in in
 * index.css) handles the transition and collapses to no-op under
 * prefers-reduced-motion. No animation library needed — the effect
 * disconnects after the first reveal.
 */
export function Reveal({ children, delay = 0, className, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') {
      el.classList.add('reveal-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            io.disconnect();
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={clsx('reveal', className)}
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
