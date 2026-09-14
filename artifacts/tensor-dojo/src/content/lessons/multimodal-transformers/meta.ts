export const meta = {
  slug: "multimodal-transformers",
  title: "Multimodal transformers: put images and text in one sequence",
  summary: "A multimodal model can map image patches, audio frames, or other signals into vectors that share a sequence space with text tokens.",
  minutes: 8,
  order: 80,
  objectives: ["Tokens do not have to start as words: explain the core mechanism in your own words.", "Alignment is learned: connect the mechanism to a measurable tradeoff.", "Sequence design is an architectural choice: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
