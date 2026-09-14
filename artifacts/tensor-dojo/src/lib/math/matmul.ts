/**
 * Per-cell helpers for the matrix-multiplication lesson's
 * MatmulExplorer interactive. The full product is delegated to the
 * existing `matMul` in `./linalg`, which is already battle-tested
 * across the codebase. The functions here exist so the lesson UI
 * can highlight one output cell and show the term-by-term
 * expansion of its dot product without recomputing the whole
 * matrix.
 */

import { matMul } from './linalg';

export type Matrix = readonly (readonly number[])[];

/** Re-export the canonical full-matrix product. */
export const matmul = matMul;

function checkShapes(A: Matrix, B: Matrix): number {
  const k = A[0]?.length ?? 0;
  const kB = B.length;
  if (k !== kB) {
    throw new Error(
      `matmulCell: shape mismatch — A is ${A.length}x${k}, B is ${kB}x${
        B[0]?.length ?? 0
      }`,
    );
  }
  return k;
}

/** A single output cell C[i][j] = row i of A · column j of B. */
export function matmulCell(
  A: Matrix,
  B: Matrix,
  i: number,
  j: number,
): number {
  const k = checkShapes(A, B);
  let s = 0;
  for (let p = 0; p < k; p++) {
    s += (A[i]![p] as number) * (B[p]![j] as number);
  }
  return s;
}

/**
 * The signed expansion of a single output cell, returned as an
 * array of term strings:
 *
 *   matmulCellTerms(A, B, 0, 0) → ['1.20·0.50', '0.40·-0.70', ...]
 *
 * Used by the centerpiece to render the live `c_ij = a_i1·b_1j +
 * a_i2·b_2j + …` line beneath the grids.
 */
export function matmulCellTerms(
  A: Matrix,
  B: Matrix,
  i: number,
  j: number,
  digits = 2,
): string[] {
  const k = checkShapes(A, B);
  const terms: string[] = [];
  for (let p = 0; p < k; p++) {
    const a = A[i]![p] as number;
    const b = B[p]![j] as number;
    terms.push(`${a.toFixed(digits)}·${b.toFixed(digits)}`);
  }
  return terms;
}
