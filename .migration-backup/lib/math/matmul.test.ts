import { describe, expect, it } from 'vitest';
import { matmul, matmulCell, matmulCellTerms } from './matmul';

describe('matmul', () => {
  it('computes the (2x3)·(3x2) product', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const B = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    expect(matmul(A, B)).toEqual([
      [58, 64],
      [139, 154],
    ]);
  });

  it('identity matrix is a no-op', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const I = [
      [1, 0],
      [0, 1],
    ];
    expect(matmul(A, I)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(matmul(I, A)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('throws on inner-dim mismatch', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const B = [
      [1, 2],
      [3, 4],
    ];
    expect(() => matmul(A, B)).toThrow(/inner dim mismatch/);
  });
});

describe('matmulCell', () => {
  const A = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  const B = [
    [7, 8],
    [9, 10],
    [11, 12],
  ];

  it('returns the same value as the full product at (i, j)', () => {
    const full = matmul(A, B);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        expect(matmulCell(A, B, i, j)).toBe(full[i]![j]);
      }
    }
  });

  it('throws on shape mismatch', () => {
    const bad = [
      [1, 2],
      [3, 4],
    ];
    expect(() => matmulCell(A, bad, 0, 0)).toThrow(/shape mismatch/);
  });
});

describe('matmulCellTerms', () => {
  it('returns k formatted product terms', () => {
    const A = [[1.234, -0.5, 2]];
    const B = [[1], [2], [3]];
    expect(matmulCellTerms(A, B, 0, 0)).toEqual([
      '1.23·1.00',
      '-0.50·2.00',
      '2.00·3.00',
    ]);
  });

  it('respects the digits parameter', () => {
    const A = [[1.234]];
    const B = [[5.678]];
    expect(matmulCellTerms(A, B, 0, 0, 3)).toEqual(['1.234·5.678']);
  });
});
