/**
 * 2D data augmentation for the early-stopping lesson.
 *
 * The lesson's centerpiece compares three configurations on a
 * 2D 3-class classification problem:
 *   (a) no regularization (baseline)
 *   (b) early stopping
 *   (c) early stopping + augmentation
 *
 * Augmentation is the only "free" data source. For images this
 * would be flips / crops / rotations; for our 2D points we
 * support rotation (around the origin) and Gaussian jitter
 * (additive noise). Both are deterministic given a seed.
 *
 *   - Rotation preserves the class label (rotating a point
 *     around the origin doesn't change which "pie slice" it
 *     falls into — the synthetic dataset is rotationally
 *     symmetric by construction).
 *   - Jitter is small enough to keep the same class label
 *     for points far from the decision boundary; near the
 *     boundary it can flip the label, which is fine — the
 *     augmentation is "synthetic data", and the model's job
 *     is to be robust to the small variation.
 */

const SEED_FACTOR = 0x9e3779b9;

/** Mulberry32 — a small deterministic PRNG. */
export function makeRng(seed: number): () => number {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rotate a 2D point around the origin by `angle` radians.
 * The class label is preserved for the synthetic dataset
 * (which is rotationally symmetric by construction).
 */
export function rotate2D(
  point: readonly [number, number],
  angle: number,
): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [x, y] = point;
  return [c * x - s * y, s * x + c * y];
}

/**
 * Add isotropic Gaussian noise. Standard normal via Box-Muller.
 * Caller is responsible for picking `sigma` small enough that
 * most points keep their label.
 */
export function jitter2D(
  point: readonly [number, number],
  sigma: number,
  rng: () => number,
): [number, number] {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const mag = Math.sqrt(-2 * Math.log(u1));
  const z0 = mag * Math.cos(2 * Math.PI * u2);
  const z1 = mag * Math.sin(2 * Math.PI * u2);
  return [point[0]! + sigma * z0, point[1]! + sigma * z1];
}

/**
 * Augment a labeled dataset by `k` synthetic copies per example,
 * each with a small rotation and Gaussian jitter. Deterministic
 * given a seed.
 *
 * The original examples are kept; the augmented ones are
 * appended. With k=0 the function returns a copy of the input.
 */
export function augmentDataset<
  T extends { x: readonly number[]; label: number },
>(
  data: readonly T[],
  k: number,
  seed: number,
  options?: { rotateMax?: number; jitterSigma?: number },
): T[] {
  if (k <= 0) return data.slice();
  const rotateMax = options?.rotateMax ?? 0.2; // ~11°
  const jitterSigma = options?.jitterSigma ?? 0.05;
  const rng = makeRng(seed * SEED_FACTOR);
  const out: T[] = data.slice();
  for (const ex of data) {
    for (let i = 0; i < k; i += 1) {
      const angle = (rng() * 2 - 1) * rotateMax;
      const [x, y] = rotate2D([ex.x[0] ?? 0, ex.x[1] ?? 0], angle);
      const [jx, jy] = jitter2D([x, y], jitterSigma, rng);
      out.push({ ...ex, x: [jx, jy] } as T);
    }
  }
  return out;
}
