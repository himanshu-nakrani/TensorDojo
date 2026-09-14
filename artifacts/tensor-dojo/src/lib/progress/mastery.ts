const STORAGE_KEY = 'tld-mastery';
const EVENT_NAME = 'tld-mastery-changed';

export interface CheckResult {
  correct: boolean;
  attempts: number;
  lastAttemptAt: number;
}

export type Mastery = Record<string, CheckResult>;

function readRaw(): Mastery {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Mastery = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const result = value as Record<string, unknown>;
      if (
        typeof result.correct === 'boolean' &&
        typeof result.attempts === 'number' &&
        Number.isFinite(result.attempts) &&
        typeof result.lastAttemptAt === 'number' &&
        Number.isFinite(result.lastAttemptAt) &&
        result.attempts > 0
      ) {
        out[key] = {
          correct: result.correct,
          attempts: Math.max(0, Math.floor(result.attempts)),
          lastAttemptAt: result.lastAttemptAt,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeRaw(mastery: Mastery): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mastery));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // Private mode and quota errors should never block lesson exploration.
  }
}

export function getMastery(): Mastery {
  return readRaw();
}

export function getCheckResult(id: string): CheckResult | null {
  return readRaw()[id] ?? null;
}

export function recordCheck(id: string, correct: boolean, at = Date.now()): CheckResult {
  const mastery = readRaw();
  const previous = mastery[id];
  const result: CheckResult = {
    correct: previous?.correct === true || correct,
    attempts: (previous?.attempts ?? 0) + 1,
    lastAttemptAt: at,
  };
  mastery[id] = result;
  writeRaw(mastery);
  return result;
}

export function subscribeToMastery(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
