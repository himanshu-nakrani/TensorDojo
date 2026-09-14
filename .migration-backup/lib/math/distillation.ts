/**
 * Knowledge distillation losses and gradients (Hinton et al., 2015).
 *
 * Two losses combined with weight alpha:
 *   L = alpha * T^2 * CE(softmax(z_s/T), softmax(z_t/T))
 *       + (1 - alpha) * CE(softmax(z_s), one_hot(y))
 *
 * The T^2 factor cancels the 1/T^2 gradient attenuation that
 * temperature softening introduces on the soft term, so alpha
 * is on a meaningful scale across temperatures.
 */

/** Numerically stable softmax with optional temperature. */
export function softmaxT(logits: readonly number[], T: number = 1): number[] {
  const n = logits.length;
  if (n === 0) return [];
  let max = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const v = logits[i] as number;
    if (v > max) max = v;
  }
  const exps: number[] = new Array<number>(n);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const v = ((logits[i] as number) - max) / T;
    const e = Math.exp(v);
    exps[i] = e;
    sum += e;
  }
  for (let i = 0; i < n; i += 1) {
    exps[i] = (exps[i] as number) / sum;
  }
  return exps;
}

/** Cross-entropy between target distribution p and predicted distribution q. */
export function crossEntropy(
  p: readonly number[],
  q: readonly number[],
): number {
  if (p.length !== q.length) {
    throw new Error('crossEntropy: vector length mismatch');
  }
  let s = 0;
  for (let i = 0; i < p.length; i += 1) {
    const qi = Math.max(q[i] as number, 1e-12);
    s -= (p[i] as number) * Math.log(qi);
  }
  return s;
}

/**
 * Combined distillation loss for one example.
 * `studentLogits` and `teacherLogits` should be the same length.
 * `yTrue` is the ground-truth class index.
 */
export function distillationLoss(
  studentLogits: readonly number[],
  teacherLogits: readonly number[],
  yTrue: number,
  T: number,
  alpha: number,
): { total: number; soft: number; hard: number } {
  const pS = softmaxT(studentLogits, T);
  const pT = softmaxT(teacherLogits, T);
  const soft = crossEntropy(pT, pS) * T * T;
  const pSHard = softmaxT(studentLogits, 1);
  const hard = -Math.log(Math.max(pSHard[yTrue] as number, 1e-12));
  const total = alpha * soft + (1 - alpha) * hard;
  return { total, soft, hard };
}

/**
 * Gradient of the combined distillation loss with respect to the
 * student's logits. Closed-form because both terms reduce to
 * cross-entropy against a fixed target distribution; the gradient of
 * CE(p, softmax(z)) wrt z is (softmax(z) - p).
 *
 * For the soft term at temperature T, the gradient is
 * (1/T) * (softmax(z/T) - p_t) and we then multiply by T^2 to get
 * T * (softmax(z/T) - p_t). The hard term is (softmax(z) - onehot).
 */
export function distillationGrad(
  studentLogits: readonly number[],
  teacherLogits: readonly number[],
  yTrue: number,
  T: number,
  alpha: number,
): number[] {
  const n = studentLogits.length;
  const pST = softmaxT(studentLogits, T);
  const pT = softmaxT(teacherLogits, T);
  const pSHard = softmaxT(studentLogits, 1);
  const out: number[] = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    const softGrad = T * ((pST[i] as number) - (pT[i] as number));
    const hardTarget = i === yTrue ? 1 : 0;
    const hardGrad = (pSHard[i] as number) - hardTarget;
    out[i] = alpha * softGrad + (1 - alpha) * hardGrad;
  }
  return out;
}

/**
 * One gradient-descent step on the student logits.
 * Returns new logits; does not mutate the input.
 */
export function distillStep(
  studentLogits: readonly number[],
  teacherLogits: readonly number[],
  yTrue: number,
  T: number,
  alpha: number,
  lr: number,
): number[] {
  const g = distillationGrad(studentLogits, teacherLogits, yTrue, T, alpha);
  return studentLogits.map((v, i) => v - lr * (g[i] as number));
}
