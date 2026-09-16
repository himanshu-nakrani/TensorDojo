/**
 * Minimal, vendor-agnostic analytics facade.
 *
 * TensorDojo has no backend, so this module never sends anything by
 * itself. When explicitly enabled at build/deploy time with
 * `VITE_ANALYTICS=on`, it forwards events to whichever analytics
 * globals happen to be present on `window`:
 *
 *   - Plausible:  window.plausible(name, { props })
 *   - PostHog:    window.posthog.capture(name, props)
 *   - GA4:        window.dataLayer.push({ event: name, ...props })
 *
 * Without the flag, track() is a no-op: a stray third-party snippet on
 * the page can never turn TensorDojo into a tracking surface (the
 * "nothing is uploaded" claim on the home page stays true).
 *
 * Privacy rule: events carry slugs/ids and counts only — never
 * assessment correctness, answers, or anything derived from them.
 * In dev, events are mirrored to the console when `?debugAnalytics`
 * is set.
 */

export type AnalyticsEvent =
  | 'hero_preset'
  | 'cta_click'
  | 'search_open'
  | 'search_navigate'
  | 'lesson_start'
  | 'lesson_complete'
  | 'lesson_uncomplete'
  | 'track_complete'
  | 'check_answer'
  | 'share_click'
  | 'onboarding_dismiss'
  | 'waitlist_submit';

declare global {
  interface Window {
    plausible?: (name: string, opts?: { props?: Record<string, unknown> }) => void;
    posthog?: { capture: (name: string, props?: Record<string, unknown>) => void };
    dataLayer?: Record<string, unknown>[];
  }
}

const ENABLED =
  typeof import.meta !== 'undefined' &&
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ANALYTICS === 'on';

let debug = false;
if (typeof window !== 'undefined') {
  try {
    debug = new URLSearchParams(window.location.search).has('debugAnalytics');
  } catch {
    debug = false;
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (debug) console.debug('[analytics]', event, props ?? {});
  if (!ENABLED) return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
    window.posthog?.capture(event, props);
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...(props ?? {}) });
    }
  } catch {
    /* analytics must never break the product */
  }
}
