export const meta = {
  slug: 'flash-attention',
  title: 'Flash attention: same math, different memory pattern',
  summary:
    'Naive attention materializes the n × n score matrix in HBM. At long context that matrix is bigger than every input combined, and the GPU spends most of its time waiting on memory. Flash attention computes the same softmax-attention output bit-for-bit, but in tiles small enough to fit in on-chip SRAM. HBM traffic drops by an order of magnitude; wall-clock follows.',
  minutes: 7,
  order: 14,
} as const;

export type LessonMeta = typeof meta;
