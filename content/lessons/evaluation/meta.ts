export const meta = {
  slug: 'evaluation',
  title: 'Evaluation: how the field measures models',
  summary:
    'The curriculum has taught how to build, train, and run a model. It has never said how to know if any of it is good. Perplexity is the original intrinsic metric — exp of the loss the model trained on. Benchmarks (MMLU, HellaSwag, HumanEval, GSM8K) are the extrinsic metrics that decide which model "wins." Both have known failure modes: perplexity correlates only loosely with downstream usefulness, and benchmarks saturate and leak.',
  minutes: 7,
  order: 41,
} as const;

export type LessonMeta = typeof meta;
