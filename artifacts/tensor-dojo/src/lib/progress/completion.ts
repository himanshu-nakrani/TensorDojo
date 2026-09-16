/**
 * Lesson completion tracking — pure localStorage, no backend.
 *
 * Distinct from `visits.ts`: a visit means "opened the page for 10s";
 * completion is an explicit reader action ("Mark complete") recorded
 * from the lesson footer. Completions drive:
 *   - the TopNav progress ring,
 *   - per-track progress bars on `/` and `/lessons`,
 *   - the completion celebration + track "belt" states.
 *
 * Storage shape:
 *   localStorage['tld-completed'] = JSON.stringify({ slug: epochMs })
 *
 * SSR-safe: every window/localStorage access is gated.
 */

const STORAGE_KEY = 'tld-completed';
export const COMPLETION_EVENT = 'tld-completion-changed';

export type Completions = Record<string, number>;

function readRaw(): Completions {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return {};
    const out: Completions = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeRaw(completions: Completions): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completions));
    window.dispatchEvent(
      new CustomEvent(COMPLETION_EVENT, { detail: { completions } }),
    );
  } catch {
    /* private mode / quota exceeded — drop silently */
  }
}

/** Mark a lesson complete (idempotent; keeps the first completion time). */
export function markCompleted(slug: string, at: number = Date.now()): void {
  const completions = readRaw();
  if (completions[slug] !== undefined) return;
  completions[slug] = at;
  writeRaw(completions);
}

/** Undo a completion (the reader changed their mind). */
export function markIncomplete(slug: string): void {
  const completions = readRaw();
  if (completions[slug] === undefined) return;
  delete completions[slug];
  writeRaw(completions);
}

export function isCompleted(slug: string): boolean {
  return readRaw()[slug] !== undefined;
}

export function getCompleted(): Completions {
  return readRaw();
}

export function completedCount(): number {
  return Object.keys(readRaw()).length;
}

/**
 * React hook: live set of completed slugs. Re-renders on same-tab
 * completion events and cross-tab `storage` events.
 */
export function subscribeToCompletions(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(COMPLETION_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(COMPLETION_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
