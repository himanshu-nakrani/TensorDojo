import { useEffect, useRef, useState } from 'react';

/**
 * Mount-only count-up: animates 0 → target once (the instrument
 * "booting" its readouts), then tracks the live value directly so
 * dragging never feels laggy. Collapses under reduced motion.
 */
export function useCountUp(target: number, duration = 650): number {
  // First paint is 0 (or the target outright under reduced motion) so
  // the readout never flashes the final value before counting up.
  const [display, setDisplay] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return target;
    }
    return 0;
  });
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) {
      setDisplay(target);
      return;
    }
    booted.current = true;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
