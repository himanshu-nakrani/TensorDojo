export const meta = {
  slug: 'tokenization',
  title: 'Tokenization: from strings to ids',
  summary:
    'A model never sees the word "cat" — it sees an integer id. The integer comes from a tokenizer, and the tokenizer is itself trained. Byte-pair encoding (BPE) is the standard: start from characters, repeatedly merge the most frequent adjacent pair, and you get a vocabulary of subwords that handles every input string in the language without an "unknown" token.',
  minutes: 8,
  order: 8,
} as const;

export type LessonMeta = typeof meta;
