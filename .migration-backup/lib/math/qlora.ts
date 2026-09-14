/**
 * Memory-budget arithmetic for QLoRA vs full FT vs LoRA.
 *
 * All numbers are in bytes. Conventions:
 *   - Full FT keeps fp16 weights, fp16 grads, fp32 Adam (m, v).
 *   - LoRA keeps fp16 base (no grad), fp16 adapter + grad,
 *     fp32 Adam on adapter only.
 *   - QLoRA keeps 4-bit base, fp16 adapter + grad, fp32 Adam
 *     on adapter only.
 *
 * Activation memory is modeled as a fixed budget that scales with
 * model size, since it depends mostly on hidden width × seq length.
 */

export type Regime = 'full' | 'lora' | 'qlora' | 'inference';

export interface Cfg {
  /** Total trainable + frozen parameter count, in billions. */
  paramsB: number;
  /** Rank of the LoRA adapter (ignored for full/inference). */
  loraRank: number;
  /** Sequence length (used only for activations). */
  seqLen: number;
}

const BYTES_PER_GB = 1024 ** 3;

/** LoRA-adapter parameter count: approximately 0.06% per rank-1 unit. */
function adapterParams(paramsB: number, rank: number): number {
  // Empirically, rank-16 LoRA on standard targets is ~1% of base.
  // Scale linearly with rank from there.
  return paramsB * 1e9 * (rank / 16) * 0.01;
}

/** Per-regime memory breakdown, in bytes. */
export interface Breakdown {
  base: number;
  adapter: number;
  gradients: number;
  optimizer: number;
  activations: number;
}

export function memoryBreakdown(regime: Regime, cfg: Cfg): Breakdown {
  const base16 = cfg.paramsB * 1e9 * 2;
  const base4 = cfg.paramsB * 1e9 * 0.5;
  const adapter = adapterParams(cfg.paramsB, cfg.loraRank);

  // Activations scale linearly with seq length and roughly with sqrt(params).
  // We use a simple model: 4 GB at 7B / seq 2048, scaling proportionally.
  const activations =
    (cfg.paramsB / 7) * (cfg.seqLen / 2048) * 4 * BYTES_PER_GB;

  switch (regime) {
    case 'full':
      return {
        base: base16,
        adapter: 0,
        gradients: base16,
        optimizer: cfg.paramsB * 1e9 * 8,
        activations,
      };
    case 'lora':
      return {
        base: base16,
        adapter: adapter * 2,
        gradients: adapter * 2,
        optimizer: adapter * 8,
        activations,
      };
    case 'qlora':
      return {
        base: base4,
        adapter: adapter * 2,
        gradients: adapter * 2,
        optimizer: adapter * 8,
        activations: activations * 0.5, // QLoRA usually pairs with checkpointing
      };
    case 'inference':
      return {
        base: base4,
        adapter: adapter * 2,
        gradients: 0,
        optimizer: 0,
        activations: activations * 0.2, // single-batch, no backward
      };
  }
}

export function totalBytes(b: Breakdown): number {
  return b.base + b.adapter + b.gradients + b.optimizer + b.activations;
}

export function bytesToGB(b: number): number {
  return b / BYTES_PER_GB;
}
