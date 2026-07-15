/**
 * Visit tracking — pure localStorage, no backend.
 *
 * Three callers, three needs:
 *   - The lesson page calls `markVisited(slug)` after the reader has
 *     been on a page long enough to count as "reading" (10s, by
 *     convention — prevents accidental bounces from polluting the
 *     "last visited" state).
 *   - The map page calls `getVisited()` to render a visited/unvisited
 *     pill on each lesson node.
 *   - The map page calls `getLastVisited()` to pick the "Resume"
 *     CTA target.
 *
 * Storage shape:
 *   localStorage['tld-visits'] = JSON.stringify({ slug: epochMs })
 *
 * Why an object map of slug -> lastVisitedAt (instead of an array or
 * a per-slug key):
 *   - O(1) lookup for "did we visit this slug?"
 *   - The "last visited" sort is just `Object.entries().sort(by-mtime)`
 *   - Trivially extensible if we ever want to record duration or
 *     other metadata per visit.
 *
 * The functions are SSR-safe: every `localStorage` / `window` access
 * is gated on `typeof window !== 'undefined'`, so importing this
 * module from a Server Component will not throw.
 */

const STORAGE_KEY = 'tld-visits';
const DEBOUNCE_MS = 1000;

export type Visits = Record<string, number>;

export interface LastVisited {
  slug: string;
  at: number;
}

function readRaw(): Visits {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return {};
    // Defensive: filter to string keys with numeric values.
    const out: Visits = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeRaw(visits: Visits): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {
    /* private mode / quota exceeded — drop silently */
  }
}

/**
 * Pending writes, keyed by slug, scheduled via setTimeout. A second
 * markVisited for the same slug within DEBOUNCE_MS collapses into a
 * single write — the marker call site is "10 seconds after mount",
 * but if the React strict-mode double-mount fires it, we don't want
 * to write twice.
 */
const pending = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Mark `slug` as visited at the current time. The write is debounced
 * by DEBOUNCE_MS so a flurry of calls (e.g. React strict-mode
 * double-mount) collapse into a single write.
 */
export function markVisited(slug: string, at: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  const existing = pending.get(slug);
  if (existing) clearTimeout(existing);
  pending.set(
    slug,
    setTimeout(() => {
      pending.delete(slug);
      const visits = readRaw();
      // Only update if `at` is newer than what's already stored.
      if ((visits[slug] ?? 0) < at) {
        visits[slug] = at;
        writeRaw(visits);
        // Notify same-tab listeners (the /map page) so the visited
        // pill updates without a page reload.
        window.dispatchEvent(
          new CustomEvent('tld-visits-changed', { detail: { slug, at } }),
        );
      }
    }, DEBOUNCE_MS),
  );
}

/** Read the full visits map. Returns {} during SSR. */
export function getVisited(): Visits {
  return readRaw();
}

/**
 * The most recently visited slug, by mtime. Returns null if the
 * reader has never visited a lesson.
 */
export function getLastVisited(): LastVisited | null {
  const visits = readRaw();
  const entries = Object.entries(visits);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [slug, at] = entries[0]!;
  return { slug, at };
}
