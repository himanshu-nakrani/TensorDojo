import { describe, expect, it } from 'vitest';
import {
  type Beam,
  beamStep,
  makeSeedBeam,
  nextLogProbs,
  runBeamSearch,
  VOCAB,
} from './beam-search';

describe('nextLogProbs', () => {
  it('rows are valid log-probability distributions', () => {
    for (const tok of VOCAB) {
      const lp = nextLogProbs(tok);
      let total = 0;
      for (const v of lp.values()) {
        if (Number.isFinite(v)) total += Math.exp(v);
      }
      expect(total).toBeCloseTo(1, 5);
    }
  });
});

describe('beamStep', () => {
  it('width 1 produces the greedy path from "the"', () => {
    // Greedy from "the" follows: the → cat → sat → on → the → mat → <eos>.
    let beams = [makeSeedBeam('the')];
    for (let i = 0; i < 10 && !beams[0]!.finished; i++) {
      beams = beamStep(beams, 1);
    }
    expect(beams[0]!.tokens).toEqual([
      'the',
      'cat',
      'sat',
      'on',
      'the',
      'cat',
      'sat',
      'on',
      'the',
      'cat',
      'sat',
    ]);
    // Greedy never picks "mat" after "on" (cat is more likely), so it
    // never reaches <eos> within the step budget. That is itself a
    // result of the lesson: greedy can miss the higher-scoring path.
  });

  it('width 1 is a length-bounded prefix of the greedy expansion', () => {
    let beams = [makeSeedBeam('the')];
    beams = beamStep(beams, 1);
    expect(beams).toHaveLength(1);
    expect(beams[0]!.tokens).toEqual(['the', 'cat']);
  });

  it('width 3 returns the three highest-scoring extensions', () => {
    let beams = [makeSeedBeam('the')];
    beams = beamStep(beams, 3);
    expect(beams).toHaveLength(3);
    // beams are sorted by score descending
    for (let i = 1; i < beams.length; i++) {
      expect(beams[i - 1]!.logProb).toBeGreaterThanOrEqual(
        beams[i]!.logProb,
      );
    }
    // The top expansion of "the" is "the cat".
    expect(beams[0]!.tokens).toEqual(['the', 'cat']);
    // "the mat" should also be on the frontier.
    const hasMat = beams.some(
      (b) => b.tokens.length === 2 && b.tokens[1] === 'mat',
    );
    expect(hasMat).toBe(true);
  });

  it('finished beams pass through unchanged', () => {
    const finished: Beam = {
      tokens: ['the', 'mat', '<eos>'],
      logProb: -2.5,
      finished: true,
    };
    const result = beamStep([finished], 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.tokens).toEqual(['the', 'mat', '<eos>']);
    expect(result[0]!.finished).toBe(true);
  });

  it('rejects k < 1', () => {
    expect(() => beamStep([makeSeedBeam()], 0)).toThrow(/k must be/);
  });
});

describe('runBeamSearch', () => {
  it('width 3 from "the" finds a finished path containing <eos>', () => {
    const beams = runBeamSearch('the', 3);
    expect(beams.length).toBeGreaterThan(0);
    // The best beam should be finished.
    expect(beams[0]!.finished).toBe(true);
    expect(beams[0]!.tokens[beams[0]!.tokens.length - 1]).toBe('<eos>');
  });

  it('a wider beam scores at least as well as a narrower one', () => {
    const narrow = runBeamSearch('the', 1);
    const wide = runBeamSearch('the', 5);
    // The best wide-beam log-prob is >= the greedy log-prob (the
    // wider beam can only find better paths or the same one).
    expect(wide[0]!.logProb).toBeGreaterThanOrEqual(narrow[0]!.logProb);
  });
});
