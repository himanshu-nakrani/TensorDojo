/**
 * Backpropagation for a tiny 3-layer MLP, by hand.
 *
 * The lesson: "backprop" is not a library, an autodiff engine,
 * or a magic primitive. It is the chain rule applied layer by
 * layer, in reverse, to a loss function. The model is small
 * enough that we can write every local derivative out by hand
 * and verify that the assembled gradient matches numerical
 * differentiation to machine precision.
 *
 * Architecture:
 *
 *   x (D=2)  →  h1 = ReLU(W1·x + b1)  (H1=4)
 *           →  h2 = ReLU(W2·h1 + b2)  (H2=2)
 *           →  y  = W3·h2 + b3         (O=1)
 *           →  L  = ½(y − t)²
 *
 * Sizes (hard-coded because the lesson is "one specific tiny
 * model", not a generic framework):
 *   - D = 2 input features
 *   - H1 = 4 hidden units in layer 1
 *   - H2 = 2 hidden units in layer 2
 *   - O = 1 output
 *
 * Conventions:
 *   - Weights W_i are shape (out, in).  Forward: h_i = σ(W_i·h_{i-1} + b_i).
 *   - For ReLU layers, σ = relu, with a relu'(z) = 1{z>0} local derivative.
 *   - For the output (no nonlinearity), the "activation" is the identity.
 *
 * The `forwardAndBackward` function is the heart of the lesson.
 * It takes one example, runs the forward pass (caching every
 * intermediate), then walks the chain rule backward and returns
 * the gradient of L with respect to every weight and bias. The
 * return is shaped so the centerpiece interactive can show:
 *   - the activation at every node
 *   - the local ∂L/∂(every weight), i.e. the per-weight gradient
 *   - which weights/activations lie on the path back to the
 *     selected weight (for the "show backward pass" toggle).
 *
 * Why by-hand, not a library: doing it once is the lesson.
 * PyTorch's autograd is doing the same thing under the hood;
 * seeing it laid out flat is what makes "no magic, just the
 * chain rule" feel real.
 */

/** Layer sizes, hard-coded for the lesson. */
export const D = 2;
export const H1 = 4;
export const H2 = 2;
export const O = 1;

/** Weights of a single layer, stored row-major: W[i][j] = weight from input j to output i. */
export type Matrix = readonly (readonly number[])[];

/** A flat parameter set for the 3-layer MLP. */
export interface MlpParams {
  /** Shape (H1, D). */
  W1: Matrix;
  /** Shape (H1,). */
  b1: readonly number[];
  /** Shape (H2, H1). */
  W2: Matrix;
  /** Shape (H2,). */
  b2: readonly number[];
  /** Shape (O, H2). */
  W3: Matrix;
  /** Shape (O,). */
  b3: readonly number[];
}

/** Intermediate values from a forward pass. */
export interface ForwardCache {
  x: readonly number[]; // input (D)
  z1: readonly number[]; // W1·x + b1 (H1, pre-activation)
  h1: readonly number[]; // relu(z1) (H1)
  z2: readonly number[]; // W2·h1 + b2 (H2, pre-activation)
  h2: readonly number[]; // relu(z2) (H2)
  z3: readonly number[]; // W3·h2 + b3 (O, pre-activation; identity activation)
  y: number; // scalar output (O=1)
  t: number; // target scalar
  loss: number; // ½ (y − t)²
}

/** Per-parameter gradients (same shape as the params). */
export interface MlpGrads {
  W1: Matrix;
  b1: readonly number[];
  W2: Matrix;
  b2: readonly number[];
  W3: Matrix;
  b3: readonly number[];
}

/** Run the forward pass and cache every intermediate. */
export function forward(params: MlpParams, x: readonly number[], t: number): ForwardCache {
  if (x.length !== D) {
    throw new Error(`backprop.forward: x must have length D=${D} (got ${x.length})`);
  }
  // Layer 1: z1 = W1·x + b1
  const z1: number[] = new Array(H1);
  for (let i = 0; i < H1; i += 1) {
    const wRow = params.W1[i]!;
    if (wRow.length !== D) {
      throw new Error(
        `backprop.forward: W1[${i}] must have length D=${D} (got ${wRow.length})`,
      );
    }
    let s = params.b1[i] ?? 0;
    for (let j = 0; j < D; j += 1) s += wRow[j]! * x[j]!;
    z1[i] = s;
  }
  const h1 = z1.map((v) => (v > 0 ? v : 0));
  // Layer 2: z2 = W2·h1 + b2
  const z2: number[] = new Array(H2);
  for (let i = 0; i < H2; i += 1) {
    const wRow = params.W2[i]!;
    if (wRow.length !== H1) {
      throw new Error(
        `backprop.forward: W2[${i}] must have length H1=${H1} (got ${wRow.length})`,
      );
    }
    let s = params.b2[i] ?? 0;
    for (let j = 0; j < H1; j += 1) s += wRow[j]! * h1[j]!;
    z2[i] = s;
  }
  const h2 = z2.map((v) => (v > 0 ? v : 0));
  // Output: z3 = W3·h2 + b3 (identity activation; O=1)
  const wRow3 = params.W3[0]!;
  if (wRow3.length !== H2) {
    throw new Error(
      `backprop.forward: W3[0] must have length H2=${H2} (got ${wRow3.length})`,
    );
  }
  let y = params.b3[0] ?? 0;
  for (let j = 0; j < H2; j += 1) y += wRow3[j]! * h2[j]!;
  const loss = 0.5 * (y - t) * (y - t);
  return { x: x.slice(), z1, h1, z2, h2, z3: [y], y, t, loss };
}

/** Run the forward pass and the backward pass. Returns (cache, grads). */
export function forwardAndBackward(
  params: MlpParams,
  x: readonly number[],
  t: number,
): { cache: ForwardCache; grads: MlpGrads } {
  const cache = forward(params, x, t);
  const grads = backward(params, cache);
  return { cache, grads };
}

/**
 * Run the backward pass only. The reader's centerpiece calls
 * this when the user moves a weight slider; it expects the
 * forward cache to be cheap to re-compute. (It isn't expensive —
 * 2→4→2→1 with ~24 weights.)
 */
export function backward(params: MlpParams, cache: ForwardCache): MlpGrads {
  // dL/dy = (y − t)
  const dLdy = cache.y - cache.t;
  // dL/dz3 = dL/dy (identity activation, derivative = 1)
  const dLdz3 = dLdy;
  // dL/dW3[0][j] = dL/dz3 * h2[j]   (j = 0..H2-1)
  const dLdW3: number[][] = [[]];
  for (let j = 0; j < H2; j += 1) {
    dLdW3[0]!.push(dLdz3 * cache.h2[j]!);
  }
  // dL/db3[0] = dL/dz3
  const dLdb3 = [dLdz3];
  // dL/dh2[j] = dL/dz3 * W3[0][j]   (j = 0..H2-1)
  const dLdh2: number[] = new Array(H2);
  for (let j = 0; j < H2; j += 1) {
    dLdh2[j] = dLdz3 * params.W3[0]![j]!;
  }
  // dL/dz2[i] = dL/dh2[i] * relu'(z2[i])   (i = 0..H2-1)
  const dLdz2: number[] = new Array(H2);
  for (let i = 0; i < H2; i += 1) {
    dLdz2[i] = dLdh2[i]! * (cache.z2[i]! > 0 ? 1 : 0);
  }
  // dL/dW2[i][j] = dL/dz2[i] * h1[j]   (i = 0..H2-1, j = 0..H1-1)
  const dLdW2: number[][] = new Array(H2);
  for (let i = 0; i < H2; i += 1) {
    const row: number[] = new Array(H1);
    for (let j = 0; j < H1; j += 1) {
      row[j] = dLdz2[i]! * cache.h1[j]!;
    }
    dLdW2[i] = row;
  }
  // dL/db2[i] = dL/dz2[i]
  const dLdb2 = dLdz2.slice();
  // dL/dh1[j] = sum_i dL/dz2[i] * W2[i][j]   (j = 0..H1-1)
  const dLdh1: number[] = new Array(H1);
  for (let j = 0; j < H1; j += 1) {
    let s = 0;
    for (let i = 0; i < H2; i += 1) s += dLdz2[i]! * params.W2[i]![j]!;
    dLdh1[j] = s;
  }
  // dL/dz1[i] = dL/dh1[i] * relu'(z1[i])
  const dLdz1: number[] = new Array(H1);
  for (let i = 0; i < H1; i += 1) {
    dLdz1[i] = dLdh1[i]! * (cache.z1[i]! > 0 ? 1 : 0);
  }
  // dL/dW1[i][j] = dL/dz1[i] * x[j]
  const dLdW1: number[][] = new Array(H1);
  for (let i = 0; i < H1; i += 1) {
    const row: number[] = new Array(D);
    for (let j = 0; j < D; j += 1) {
      row[j] = dLdz1[i]! * cache.x[j]!;
    }
    dLdW1[i] = row;
  }
  const dLdb1 = dLdz1.slice();
  return {
    W1: dLdW1,
    b1: dLdb1,
    W2: dLdW2,
    b2: dLdb2,
    W3: dLdW3,
    b3: dLdb3,
  };
}

/**
 * Numerical gradient of the loss with respect to a single
 * scalar parameter, via central difference. Used by the tests
 * to verify the analytical backprop; the centerpiece's
 * secondary widget uses it as a one-axis cross-section.
 */
export function numericalGradientScalar(
  params: MlpParams,
  x: readonly number[],
  t: number,
  path: ParamPath,
  h = 1e-5,
): number {
  const perturbed = cloneAndPerturb(params, path, h);
  const negPerturbed = cloneAndPerturb(params, path, -h);
  const f1 = forward(perturbed, x, t).loss;
  const f0 = forward(negPerturbed, x, t).loss;
  return (f1 - f0) / (2 * h);
}

/** Path to a single parameter: which matrix/vector and which (i, [j]). */
export type ParamPath =
  | { kind: 'W1'; i: number; j: number }
  | { kind: 'b1'; i: number }
  | { kind: 'W2'; i: number; j: number }
  | { kind: 'b2'; i: number }
  | { kind: 'W3'; i: number; j: number }
  | { kind: 'b3'; i: number };

function cloneAndPerturb(params: MlpParams, path: ParamPath, h: number): MlpParams {
  const cloneMatrix = (m: Matrix): number[][] => m.map((r) => r.slice());
  const cloneVec = (v: readonly number[]): number[] => v.slice();
  const W1 = cloneMatrix(params.W1);
  const W2 = cloneMatrix(params.W2);
  const W3 = cloneMatrix(params.W3);
  const b1 = cloneVec(params.b1);
  const b2 = cloneVec(params.b2);
  const b3 = cloneVec(params.b3);
  switch (path.kind) {
    case 'W1':
      W1[path.i]![path.j] = (W1[path.i]![path.j] ?? 0) + h;
      break;
    case 'b1':
      b1[path.i] = (b1[path.i] ?? 0) + h;
      break;
    case 'W2':
      W2[path.i]![path.j] = (W2[path.i]![path.j] ?? 0) + h;
      break;
    case 'b2':
      b2[path.i] = (b2[path.i] ?? 0) + h;
      break;
    case 'W3':
      W3[path.i]![path.j] = (W3[path.i]![path.j] ?? 0) + h;
      break;
    case 'b3':
      b3[path.i] = (b3[path.i] ?? 0) + h;
      break;
  }
  return { W1, b1, W2, b2, W3, b3 };
}

/** Total number of scalar parameters in the 3-layer MLP. */
export const NUM_PARAMS = H1 * D + H1 + H2 * H1 + H2 + O * H2 + O;

/** A reasonable random seed for the test fixtures. */
export function defaultParams(seed = 0): MlpParams {
  // Tiny PRNG; deterministic.
  let s = seed * 2654435761 + 1;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 0xffffffff) * 2 - 1; // uniform in [-1, 1]
  };
  const W1: number[][] = new Array(H1);
  for (let i = 0; i < H1; i += 1) {
    const row: number[] = new Array(D);
    for (let j = 0; j < D; j += 1) row[j] = rand() * 0.5;
    W1[i] = row;
  }
  const b1: number[] = new Array(H1).fill(0);
  const W2: number[][] = new Array(H2);
  for (let i = 0; i < H2; i += 1) {
    const row: number[] = new Array(H1);
    for (let j = 0; j < H1; j += 1) row[j] = rand() * 0.5;
    W2[i] = row;
  }
  const b2: number[] = new Array(H2).fill(0);
  const W3: number[][] = [new Array(H2)];
  for (let j = 0; j < H2; j += 1) W3[0]![j] = rand() * 0.5;
  const b3: number[] = [0];
  return { W1, b1, W2, b2, W3, b3 };
}

/** Take one SGD step (params = params − η · grads). */
export function sgdStep(
  params: MlpParams,
  grads: MlpGrads,
  eta: number,
): MlpParams {
  if (eta < 0 || !Number.isFinite(eta)) {
    throw new Error(`backprop.sgdStep: eta must be a non-negative finite number (got ${eta})`);
  }
  const sub = (a: readonly number[], b: readonly number[]): number[] => {
    const out = new Array(a.length);
    for (let i = 0; i < a.length; i += 1) out[i] = (a[i] ?? 0) - eta * (b[i] ?? 0);
    return out;
  };
  const subM = (a: Matrix, b: Matrix): number[][] => {
    const out: number[][] = new Array(a.length);
    for (let i = 0; i < a.length; i += 1) {
      out[i] = sub(a[i]!, b[i]!);
    }
    return out;
  };
  return {
    W1: subM(params.W1, grads.W1),
    b1: sub(params.b1, grads.b1),
    W2: subM(params.W2, grads.W2),
    b2: sub(params.b2, grads.b2),
    W3: subM(params.W3, grads.W3),
    b3: sub(params.b3, grads.b3),
  };
}
