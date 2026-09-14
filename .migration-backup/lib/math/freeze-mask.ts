/**
 * Per-layer freeze mask for the gradient. Used by the lesson-28 LayerFreezeExplorer sim.
 * Multiplies each layer's gradient slice by 0 (frozen) or 1 (trainable).
 */

export interface FreezeMask {
  layer1: boolean;
  layer2: boolean;
  layer3: boolean;
}

// Mirror the model constants from training.ts.
// Keep in sync if the model architecture changes.
const N_IN = 2;
const N_HID = 8;
const N_OUT = 3;
const N_PARAMS_LOCAL = N_HID * N_IN + N_HID + N_HID * N_HID + N_HID + N_OUT * N_HID + N_OUT;

const L1_LEN = N_HID * N_IN + N_HID; // W1 + b1
const L2_LEN = N_HID * N_HID + N_HID; // W2 + b2
const L3_LEN = N_OUT * N_HID + N_OUT; // W3 + b3

/**
 * Return a copy of `grad` with the gradient slices for any frozen layer zeroed out.
 * Throws if grad.length !== N_PARAMS.
 */
export function applyFreezeMask(grad: readonly number[], mask: FreezeMask): number[] {
  if (grad.length !== N_PARAMS_LOCAL) {
    throw new Error(
      `applyFreezeMask: expected grad.length === ${N_PARAMS_LOCAL}, got ${grad.length}`,
    );
  }
  const out = grad.slice() as number[];
  if (mask.layer1) {
    for (let i = 0; i < L1_LEN; i += 1) out[i] = 0;
  }
  if (mask.layer2) {
    for (let i = L1_LEN; i < L1_LEN + L2_LEN; i += 1) out[i] = 0;
  }
  if (mask.layer3) {
    for (let i = L1_LEN + L2_LEN; i < L1_LEN + L2_LEN + L3_LEN; i += 1) out[i] = 0;
  }
  return out;
}

/**
 * Return the number of trainable parameters under the given mask.
 * A frozen layer contributes 0; a trainable layer contributes its full length.
 */
export function freezeParamCount(mask: FreezeMask): number {
  return (mask.layer1 ? 0 : L1_LEN) + (mask.layer2 ? 0 : L2_LEN) + (mask.layer3 ? 0 : L3_LEN);
}
