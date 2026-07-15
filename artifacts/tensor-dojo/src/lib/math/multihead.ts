/**
 * Multi-head attention (Vaswani et al., 2017).
 *
 * Given Q, K, V each of shape [n, d_model], split d_model into h heads
 * of size d_k = d_model / h. Each head has its own learned Q, K, V
 * projections (here: identity for the visual lesson). Compute attention
 * per head, concatenate, project back to d_model.
 *
 * This is the *architectural* shape; for the lesson centerpiece, we
 * use a small h and let the user drag per-head rotation sliders to
 * "look at" different pairs. The math here is the production shape
 * (and it's small enough to test).
 */
import { scaledDot, matMul, transpose } from './linalg';
import { softmaxRows } from './softmax';
import { causalMask, applyMask } from './mask';

export interface MultiHeadAttentionInput {
  Q: readonly (readonly number[])[];
  K: readonly (readonly number[])[];
  V: readonly (readonly number[])[];
  h: number;
  /** Per-head Q, K, V projections of shape [d_model, d_k]. Optional. */
  Wq?: readonly (readonly number[])[];
  Wk?: readonly (readonly number[])[];
  Wv?: readonly (readonly number[])[];
  Wout?: readonly (readonly number[])[];
  /** If true, apply causal mask (lower-triangular). */
  causal?: boolean;
}

/**
 * Run multi-head attention. Returns the concatenated head outputs
 * projected back to d_model. The number of heads must divide
 * d_model evenly.
 */
export function multiHeadAttention(
  input: MultiHeadAttentionInput,
): number[][] {
  const { Q, K, V, h, causal } = input;
  const n = Q.length;
  if (K.length !== n || V.length !== n) {
    throw new Error(
      `multiHeadAttention: Q, K, V must have the same length (got ${Q.length}, ${K.length}, ${V.length})`,
    );
  }
  const dModel = Q[0]!.length;
  if (dModel % h !== 0) {
    throw new Error(
      `multiHeadAttention: d_model must be divisible by h (got ${dModel} / ${h})`,
    );
  }
  const dK = dModel / h;

  const Wq = input.Wq ?? identityMatrix(dModel);
  const Wk = input.Wk ?? identityMatrix(dModel);
  const Wv = input.Wv ?? identityMatrix(dModel);
  const Wout = input.Wout ?? identityMatrix(dModel);

  // Project to d_model (in the unprojected case, this is a no-op).
  const Qp = matMul(Q, Wq);
  const Kp = matMul(K, Wk);
  const Vp = matMul(V, Wv);

  // Reshape into heads: [n, d_model] -> [n, h, d_k] -> [h, n, d_k]
  const splitHeads = (X: readonly (readonly number[])[]): number[][][] => {
    const out: number[][][] = Array.from({ length: h }, () =>
      Array.from({ length: n }, () => new Array<number>(dK).fill(0)),
    );
    for (let i = 0; i < n; i += 1) {
      for (let head = 0; head < h; head += 1) {
        for (let j = 0; j < dK; j += 1) {
          out[head]![i]![j] = X[i]![head * dK + j] as number;
        }
      }
    }
    return out;
  };
  const Qh = splitHeads(Qp);
  const Kh = splitHeads(Kp);
  const Vh = splitHeads(Vp);

  // Per head: scaled dot-product attention, with optional causal mask.
  const mask = causal ? causalMask(n) : null;
  const headOutputs: number[][][] = [];
  for (let head = 0; head < h; head += 1) {
    const QhT = Qh[head]!;
    const KhT = Kh[head]!;
    const VhT = Vh[head]!;
    // K^T (true transpose)
    const KhT_T_real: number[][] = [];
    for (let i = 0; i < KhT[0]!.length; i += 1) {
      const row: number[] = new Array<number>(n);
      for (let j = 0; j < n; j += 1) row[j] = KhT[j]![i] as number;
      KhT_T_real.push(row);
    }
    const rawScores = matMul(QhT, KhT_T_real);
    const divided = rawScores.map((row) => row.map((v) => v / Math.sqrt(dK)));
    const masked = mask ? applyMask(divided, mask) : divided;
    const weights = softmaxRows(masked);
    const headOut = matMul(weights, VhT);
    headOutputs.push(headOut);
  }

  // Concat heads back: [h, n, d_k] -> [n, d_model]
  const concat: number[][] = Array.from({ length: n }, () =>
    new Array<number>(dModel).fill(0),
  );
  for (let i = 0; i < n; i += 1) {
    for (let head = 0; head < h; head += 1) {
      const headOut = headOutputs[head]![i]!;
      for (let j = 0; j < dK; j += 1) {
        concat[i]![head * dK + j] = headOut[j]!;
      }
    }
  }
  // Project out
  return matMul(concat, Wout);
}

function identityMatrix(n: number): number[][] {
  const m: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  for (let i = 0; i < n; i += 1) m[i]![i] = 1;
  return m;
}
