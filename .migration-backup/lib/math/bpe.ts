/**
 * Byte-pair encoding (BPE) — the standard subword tokenization
 * algorithm. Sennrich, Haddow, & Birch (2015) introduced it for
 * neural MT; GPT, LLaMA, Mistral, and almost every modern LLM use
 * a variant.
 *
 * Pedagogical implementation: character-level (not byte-level) and
 * deterministic. Good enough for visualizing the algorithm in a
 * lesson; not production-grade.
 *
 * The end-of-word marker is `▁` (the SentencePiece convention). It
 * lets BPE distinguish `low▁` (the whole word "low") from `low`
 * (a prefix of "lower"), without which the algorithm cannot tell a
 * suffix from a complete word.
 */

/** End-of-word marker. Appended to the last character of every word. */
export const EOW = '▁'; // ▁

/** One BPE merge: combine `a` + `b` into a single token. Order matters. */
export interface BPEMerge {
  /** Left symbol being merged. */
  a: string;
  /** Right symbol being merged. */
  b: string;
  /** The combined symbol that replaces every adjacent (a, b) pair. */
  merged: string;
}

/** A snapshot of one training step, suitable for the sim to render. */
export interface BPEStep {
  /** 1-indexed step number. */
  step: number;
  /** The pair that was merged this step. */
  merge: BPEMerge;
  /** How many times the pair appeared in the corpus at this step. */
  frequency: number;
  /** Full sorted vocabulary after this step (deterministic order). */
  vocabAfter: readonly string[];
}

/** Output of `learnBPE`. */
export interface BPETraining {
  /** Final vocabulary, sorted. */
  vocab: readonly string[];
  /** Merges in the order they were learned. */
  merges: readonly BPEMerge[];
  /** Step-by-step trace of the training, for visualization. */
  history: readonly BPEStep[];
  /** The starting corpus, split into a per-word list of symbol sequences. */
  initialWords: readonly (readonly string[])[];
  /** Word-by-word state after each merge step (for the sim's left panel). */
  wordHistory: readonly (readonly (readonly string[])[])[];
}

/**
 * Split a word into its initial per-character symbols, with the EOW
 * marker appended to the final character. "low" → ["l", "o", "w▁"].
 */
function splitWord(word: string): string[] {
  const chars = Array.from(word);
  if (chars.length === 0) return [];
  const last = chars.length - 1;
  chars[last] = (chars[last] as string) + EOW;
  return chars;
}

/**
 * Find the most frequent adjacent symbol pair across the (word,
 * count) corpus. Ties are broken by the lexicographic order of the
 * pair (a, b) for determinism — important so the sim is reproducible
 * step-by-step.
 *
 * Returns null if the corpus has no adjacent pairs left (i.e., every
 * "word" has shrunk to a single symbol).
 */
function topPair(
  words: readonly (readonly string[])[],
  counts: readonly number[],
): { a: string; b: string; frequency: number } | null {
  const tally = new Map<string, { a: string; b: string; n: number }>();
  for (let w = 0; w < words.length; w += 1) {
    const wd = words[w]!;
    const c = counts[w]!;
    for (let i = 0; i < wd.length - 1; i += 1) {
      const a = wd[i]!;
      const b = wd[i + 1]!;
      const key = `${a}\x00${b}`;
      const cur = tally.get(key);
      if (cur) cur.n += c;
      else tally.set(key, { a, b, n: c });
    }
  }
  if (tally.size === 0) return null;
  let best: { a: string; b: string; n: number } | null = null;
  for (const entry of tally.values()) {
    if (
      best === null ||
      entry.n > best.n ||
      (entry.n === best.n &&
        (entry.a < best.a || (entry.a === best.a && entry.b < best.b)))
    ) {
      best = entry;
    }
  }
  return { a: best!.a, b: best!.b, frequency: best!.n };
}

/**
 * Apply one merge across the whole word corpus, returning a new
 * word list. Adjacent (a, b) pairs collapse into a single `merged`
 * symbol; the rest of the word is untouched.
 */
function applyMerge(
  words: readonly (readonly string[])[],
  a: string,
  b: string,
  merged: string,
): string[][] {
  const out: string[][] = [];
  for (const wd of words) {
    const next: string[] = [];
    let i = 0;
    while (i < wd.length) {
      if (i < wd.length - 1 && wd[i] === a && wd[i + 1] === b) {
        next.push(merged);
        i += 2;
      } else {
        next.push(wd[i] as string);
        i += 1;
      }
    }
    out.push(next);
  }
  return out;
}

/**
 * Collect the set of all symbols currently appearing in the corpus.
 * Sorted for determinism.
 */
function vocabOf(words: readonly (readonly string[])[]): string[] {
  const set = new Set<string>();
  for (const wd of words) for (const sym of wd) set.add(sym);
  return Array.from(set).sort();
}

/**
 * Count occurrences of each unique whitespace-separated word across
 * the corpus. Returns parallel arrays so each row is `(word, count)`.
 */
function corpusToWordCounts(
  corpus: readonly string[],
): { words: string[]; counts: number[] } {
  const tally = new Map<string, number>();
  for (const line of corpus) {
    for (const w of line.toLowerCase().split(/\s+/)) {
      if (w.length === 0) continue;
      tally.set(w, (tally.get(w) ?? 0) + 1);
    }
  }
  const words: string[] = [];
  const counts: number[] = [];
  for (const [w, n] of tally) {
    words.push(w);
    counts.push(n);
  }
  return { words, counts };
}

/**
 * Train BPE on a corpus of strings. Greedy: at each step, find the
 * most frequent adjacent symbol pair and merge it.
 *
 * Returns the final vocabulary, the ordered list of merges, and the
 * full step-by-step history (suitable for a step-through sim).
 */
export function learnBPE(
  corpus: readonly string[],
  numMerges: number,
): BPETraining {
  if (numMerges < 0) throw new Error(`numMerges must be >= 0, got ${numMerges}`);
  const { words: uniqueWords, counts } = corpusToWordCounts(corpus);
  // Each unique word becomes a sequence of symbols (chars + EOW).
  let state: string[][] = uniqueWords.map((w) => splitWord(w));
  const initialWords = state.map((w) => w.slice());
  const merges: BPEMerge[] = [];
  const history: BPEStep[] = [];
  const wordHistory: string[][][] = [];
  for (let step = 1; step <= numMerges; step += 1) {
    const top = topPair(state, counts);
    if (top === null) break;
    const merged = top.a + top.b;
    state = applyMerge(state, top.a, top.b, merged);
    const merge: BPEMerge = { a: top.a, b: top.b, merged };
    merges.push(merge);
    history.push({
      step,
      merge,
      frequency: top.frequency,
      vocabAfter: vocabOf(state),
    });
    wordHistory.push(state.map((w) => w.slice()));
  }
  return {
    vocab: vocabOf(state),
    merges,
    history,
    initialWords,
    wordHistory,
  };
}

/**
 * Encode a single word against a learned merge list. Greedy: apply
 * every merge in order to the per-character split.
 *
 * Symbols not in the merge list pass through as their characters
 * (or character + EOW for the final position). This is the standard
 * BPE inference path — no probabilities, just merge-list replay.
 */
export function encodeWord(word: string, merges: readonly BPEMerge[]): string[] {
  if (word.length === 0) return [];
  let symbols = splitWord(word);
  for (const m of merges) {
    if (symbols.length < 2) break;
    const next: string[] = [];
    let i = 0;
    while (i < symbols.length) {
      if (
        i < symbols.length - 1 &&
        symbols[i] === m.a &&
        symbols[i + 1] === m.b
      ) {
        next.push(m.merged);
        i += 2;
      } else {
        next.push(symbols[i] as string);
        i += 1;
      }
    }
    symbols = next;
  }
  return symbols;
}

/**
 * Encode a whole input string (one or more whitespace-separated
 * words) against a learned merge list. Returns a flat list of
 * subword tokens. The EOW marker is preserved on the final symbol
 * of each word so the caller can recover word boundaries if needed.
 */
export function encode(text: string, merges: readonly BPEMerge[]): string[] {
  const out: string[] = [];
  for (const w of text.toLowerCase().split(/\s+/)) {
    if (w.length === 0) continue;
    for (const sym of encodeWord(w, merges)) out.push(sym);
  }
  return out;
}
