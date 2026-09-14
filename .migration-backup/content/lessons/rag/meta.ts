export const meta = {
  slug: 'rag',
  title: 'RAG: retrieve, then generate',
  summary:
    'A pretrained LLM knows what was in its training data. For everything else — a private codebase, last week\'s news, a specific user\'s emails — the model needs to read the source at inference time. RAG is the standard recipe: embed the query, retrieve the top-k most similar documents from a vector store, paste them into the prompt, generate. Same model, much narrower hallucination rate.',
  minutes: 8,
  order: 58,
} as const;

export type LessonMeta = typeof meta;
