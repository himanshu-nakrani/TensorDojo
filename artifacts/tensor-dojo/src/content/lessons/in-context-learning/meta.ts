export const meta = {
  slug: 'in-context-learning',
  title: 'In-context learning: examples in the prompt change the answer',
  summary:
    'A pretrained LLM with frozen weights performs new tasks just by reading a few examples in the prompt. No fine-tuning, no gradient step — the same forward pass that decodes "the cat sat on the ___" also performs translation, classification, and arithmetic, depending on what you put in front of the question. This is the mechanism behind few-shot prompting and the whole "prompt engineering" practice.',
  minutes: 8,
  order: 50,
} as const;

export type LessonMeta = typeof meta;
