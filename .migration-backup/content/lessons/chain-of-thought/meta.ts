export const meta = {
  slug: 'chain-of-thought',
  title: 'Chain-of-thought: thinking out loud as a sampling pattern',
  summary:
    'A model asked for a direct answer to "(13 × 4) + 27" often gets it wrong. The same model, prompted to think step by step, gets it right. Nothing about the model changed — but spreading the computation across many sampled tokens lets the model use its forward pass as a scratchpad. This is the trick behind every modern reasoning model and the entire "let\'s think step by step" prompting tradition.',
  minutes: 7,
  order: 51,
} as const;

export type LessonMeta = typeof meta;
