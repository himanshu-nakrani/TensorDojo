import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { silu, swiglu } from '../artifacts/tensor-dojo/src/lib/math/activations.ts';
import { attentionForward } from '../artifacts/tensor-dojo/src/lib/math/attention-output.ts';
import { ffn } from '../artifacts/tensor-dojo/src/lib/math/ffn.ts';
import { layerNormBatch } from '../artifacts/tensor-dojo/src/lib/math/layernorm.ts';
import { dot, matMul } from '../artifacts/tensor-dojo/src/lib/math/linalg.ts';
import { multiHeadAttention } from '../artifacts/tensor-dojo/src/lib/math/multihead.ts';
import { softmax } from '../artifacts/tensor-dojo/src/lib/math/softmax.ts';

type BenchmarkResult = {
  name: string;
  workload: string;
  warmupIterations: number;
  measuredIterations: number;
  totalMs: number;
  meanMs: number;
  opsPerSecond: number;
  workUnitsPerSecond: number;
  checksum: number;
};

const results: BenchmarkResult[] = [];

function finiteChecksum(value: number): number {
  if (!Number.isFinite(value)) throw new Error(`Non-finite benchmark result: ${value}`);
  return value;
}

function runBenchmark(
  name: string,
  workload: string,
  fn: () => number,
  measuredIterations: number,
  workUnitsPerIteration: number,
  warmupIterations = Math.max(3, Math.min(20, Math.ceil(measuredIterations / 5))),
): BenchmarkResult {
  let checksum = 0;
  for (let i = 0; i < warmupIterations; i += 1) checksum += finiteChecksum(fn());

  const start = performance.now();
  for (let i = 0; i < measuredIterations; i += 1) checksum += finiteChecksum(fn());
  const totalMs = performance.now() - start;

  const result: BenchmarkResult = {
    name,
    workload,
    warmupIterations,
    measuredIterations,
    totalMs,
    meanMs: totalMs / measuredIterations,
    opsPerSecond: (measuredIterations * 1000) / totalMs,
    workUnitsPerSecond: (measuredIterations * workUnitsPerIteration * 1000) / totalMs,
    checksum,
  };
  results.push(result);
  return result;
}

function makeVector(length: number, phase = 0): number[] {
  return Array.from({ length }, (_, i) => Math.sin(i * 0.017 + phase) * 0.75 + Math.cos(i * 0.031 - phase) * 0.25);
}

function makeMatrix(rows: number, cols: number, phase = 0): number[][] {
  return Array.from({ length: rows }, (_, r) => makeVector(cols, phase + r * 0.11));
}

function makeIdentity(size: number): number[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r === c ? 1 : 0)),
  );
}

const scalarA = makeVector(100_000, 0.2);
const scalarB = makeVector(100_000, 1.1);
const scalarMeasured = runBenchmark(
  'swiglu.updated',
  '100,000 scalar SwiGLU calls per iteration',
  () => {
    let sum = 0;
    for (let i = 0; i < scalarA.length; i += 1) sum += swiglu(scalarA[i]!, scalarB[i]!);
    return sum;
  },
  25,
  scalarA.length,
  5,
);

const scalarBaseline = runBenchmark(
  'swiglu.baseline',
  '100,000 scalar silu(a) * b calls per iteration; pre-fix equivalent',
  () => {
    let sum = 0;
    for (let i = 0; i < scalarA.length; i += 1) sum += silu(scalarA[i]!) * scalarB[i]!;
    return sum;
  },
  25,
  scalarA.length,
  5,
);

const vectorA = makeVector(1024, 0.4);
const vectorB = makeVector(1024, 1.7);
runBenchmark('dot', '1,024-element vectors', () => dot(vectorA, vectorB), 2_000, 1024);

const matA = makeMatrix(32, 64, 0.3);
const matB = makeMatrix(64, 32, 1.4);
runBenchmark('matMul', '32×64 · 64×32 → 32×32', () => {
  const out = matMul(matA, matB);
  return out[0]![0]! + out[31]![31]!;
}, 100, 32 * 64 * 32);

const scores = makeVector(1024, 0.8);
runBenchmark('softmax', '1,024-element stable softmax', () => {
  const out = softmax(scores, 1.1);
  return out[0]! + out[1023]!;
}, 1_000, 1024);

const normBatch = makeMatrix(256, 128, 0.6);
runBenchmark('layerNormBatch', '256 rows × 128 features', () => {
  const out = layerNormBatch(normBatch);
  return out[0]![0]! + out[255]![127]!;
}, 100, 256 * 128);

const attentionScores = makeMatrix(64, 64, 0.2);
const attentionValues = makeMatrix(64, 32, 1.2);
runBenchmark('attentionForward', '64×64 scores + 64×32 values', () => {
  const out = attentionForward({ scores: attentionScores, V: attentionValues, dK: 32 });
  return out[0]![0]! + out[63]![31]!;
}, 50, 64 * 64 * 32);

const ffnInput = {
  x: makeMatrix(16, 64, 0.1),
  W1: makeMatrix(64, 256, 0.7),
  b1: makeVector(256, 0.5),
  W2: makeMatrix(256, 64, 1.5),
  b2: makeVector(64, 1.9),
};
runBenchmark('ffn', '16 tokens, d=64, d_ff=256', () => {
  const out = ffn(ffnInput);
  return out[0]![0]! + out[15]![63]!;
}, 10, 16 * 64 * 256 * 2);

const mhaInput = {
  Q: makeMatrix(32, 64, 0.1),
  K: makeMatrix(32, 64, 0.9),
  V: makeMatrix(32, 64, 1.7),
  h: 8,
  Wq: makeIdentity(64),
  Wk: makeIdentity(64),
  Wv: makeIdentity(64),
  Wout: makeIdentity(64),
  causal: true,
};
runBenchmark('multiHeadAttention', '32 tokens, d_model=64, h=8, causal', () => {
  const out = multiHeadAttention(mhaInput);
  return out[0]![0]! + out[31]![63]!;
}, 10, 32 * 32 * 64);

const updatedMean = scalarMeasured.meanMs;
const baselineMean = scalarBaseline.meanMs;
const overheadPct = ((updatedMean / baselineMean) - 1) * 100;
const summary = {
  metadata: {
    commit: '9d65f21',
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    cpuCount: os.cpus().length,
    generatedAt: new Date().toISOString(),
    note: 'Deterministic in-memory workloads; timings are process-local and should be compared on the same machine.',
  },
  swigluComparison: {
    updatedMeanMs: updatedMean,
    baselineMeanMs: baselineMean,
    overheadPct,
    interpretation: overheadPct >= 0 ? 'updated-minus-branch overhead' : 'updated implementation was faster in this run',
  },
  results,
};

console.log(JSON.stringify(summary, null, 2));
