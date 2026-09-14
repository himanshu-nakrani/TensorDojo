/**
 * One transformer block's forward pass (decoder-style, pre-norm).
 *
 *   x_in   = x                                          (input)
 *   x1     = useLN1 ? LayerNorm(x_in) : x_in            (pre-norm 1)
 *   a      = MHA(x1, mask=causal)                       (attention)
 *   h      = useRes1 ? x_in + a : a                     (residual 1)
 *   x2     = useLN2 ? LayerNorm(h) : h                  (pre-norm 2)
 *   f      = FFN(x2)                                    (feed-forward)
 *   out    = useRes2 ? h + f : f                        (residual 2)
 *
 * Pre-norm (layernorm before the sublayer) is the modern convention:
 * numerically stable at depth, and what the reader will encounter
 * in every current codebase. The block returns *all* intermediates
 * so the BlockPipeline can render every step of the data flow.
 */
import { multiHeadAttention } from './multihead';
import { layerNormBatch } from './layernorm';
import { ffn } from './ffn';

export interface TransformerBlockInput {
  /** Token activations of shape [T, d]. */
  x: readonly (readonly number[])[];
  /** Multi-head attention projections. Each is [d, d] (d = d_model). */
  Wq: readonly (readonly number[])[];
  Wk: readonly (readonly number[])[];
  Wv: readonly (readonly number[])[];
  /** Output projection after concatenating heads. [d, d]. */
  Wo: readonly (readonly number[])[];
  /** Number of attention heads. Must divide d evenly. */
  h: number;
  /** FFN first layer: d → d_ff. [d, d_ff]. */
  W1: readonly (readonly number[])[];
  b1: readonly number[];
  /** FFN second layer: d_ff → d. [d_ff, d]. */
  W2: readonly (readonly number[])[];
  b2: readonly number[];
  /** LayerNorm affine parameters (one per dim). */
  lnGamma: readonly number[];
  lnBeta: readonly number[];
  /** Apply causal mask in the attention step. Default true. */
  causal?: boolean;
  /** Sublayer toggles — used to make the lesson toggles pedagogical. */
  useLN1?: boolean;
  useRes1?: boolean;
  useLN2?: boolean;
  useRes2?: boolean;
}

export interface TransformerBlockOutput {
  /** The original input (after the embedding + PE step). */
  xIn: number[][];
  /** Output of LN1 (or xIn if LN1 was off). */
  xNorm1: number[][];
  /** MHA output (added back via residual 1). */
  attnOut: number[][];
  /** Post-residual-1 activations (or attnOut if residual was off). */
  residual1: number[][];
  /** Output of LN2 (or residual1 if LN2 was off). */
  xNorm2: number[][];
  /** FFN output (added back via residual 2). */
  ffnOut: number[][];
  /** The block's output for each token. */
  xOut: number[][];
}

const DEFAULTS = {
  causal: true,
  useLN1: true,
  useRes1: true,
  useLN2: true,
  useRes2: true,
} as const;

/**
 * Run a single block forward. Returns every intermediate so the
 * BlockPipeline can render the data flow.
 */
export function transformerBlock(
  input: TransformerBlockInput,
): TransformerBlockOutput {
  const {
    x,
    Wq,
    Wk,
    Wv,
    Wo,
    h,
    W1,
    b1,
    W2,
    b2,
    lnGamma,
    lnBeta,
    causal = DEFAULTS.causal,
    useLN1 = DEFAULTS.useLN1,
    useRes1 = DEFAULTS.useRes1,
    useLN2 = DEFAULTS.useLN2,
    useRes2 = DEFAULTS.useRes2,
  } = input;

  const T = x.length;
  if (T === 0) {
    const empty: number[][] = [];
    return {
      xIn: [],
      xNorm1: [],
      attnOut: [],
      residual1: [],
      xNorm2: [],
      ffnOut: [],
      xOut: [],
    };
  }
  const d = x[0]!.length;
  if (Wo.length !== d || (Wo[0] ?? []).length !== d) {
    throw new Error(
      `transformerBlock: Wo must be ${d}×${d} (got ${Wo.length}×${Wo[0]?.length ?? 0})`,
    );
  }
  if (d % h !== 0) {
    throw new Error(
      `transformerBlock: d must be divisible by h (got ${d} / ${h})`,
    );
  }
  if (lnGamma.length !== d || lnBeta.length !== d) {
    throw new Error(
      `transformerBlock: lnGamma/lnBeta length must be ${d} (got ${lnGamma.length}/${lnBeta.length})`,
    );
  }

  // Step 1: layernorm 1 (or skip).
  const xIn = x.map((r) => r.slice());
  const xNorm1 = useLN1 ? layerNormBatch(xIn, lnGamma, lnBeta) : xIn;

  // Step 2: multi-head attention. MHA takes Q, K, V — we pass xNorm1
  // as all three (self-attention).
  const attnOut = multiHeadAttention({
    Q: xNorm1,
    K: xNorm1,
    V: xNorm1,
    h,
    Wq,
    Wk,
    Wv,
    Wout: Wo,
    causal,
  });

  // Step 3: residual 1.
  const residual1 = useRes1 ? addRowwise(xIn, attnOut) : attnOut;

  // Step 4: layernorm 2 (or skip).
  const xNorm2 = useLN2 ? layerNormBatch(residual1, lnGamma, lnBeta) : residual1;

  // Step 5: FFN.
  const ffnOut = ffn({ x: xNorm2, W1, b1, W2, b2 });

  // Step 6: residual 2.
  const xOut = useRes2 ? addRowwise(residual1, ffnOut) : ffnOut;

  return {
    xIn,
    xNorm1,
    attnOut,
    residual1,
    xNorm2,
    ffnOut,
    xOut,
  };
}

/** Element-wise row addition. Returns a new matrix. */
function addRowwise(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
): number[][] {
  const T = a.length;
  if (T === 0 || b.length !== T) return a.map((r) => r.slice());
  const d = a[0]!.length;
  const out: number[][] = Array.from({ length: T }, () =>
    new Array<number>(d).fill(0),
  );
  for (let t = 0; t < T; t += 1) {
    const ar = a[t]!;
    const br = b[t]!;
    for (let k = 0; k < d; k += 1) {
      out[t]![k] = ar[k]! + br[k]!;
    }
  }
  return out;
}
