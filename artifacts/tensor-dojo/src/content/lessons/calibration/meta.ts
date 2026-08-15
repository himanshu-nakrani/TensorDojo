export const meta = {
  slug: "calibration",
  title: "Calibration: confidence should mean something",
  summary: "A model can be accurate while overconfident or underconfident. Calibration asks whether predicted probabilities match observed frequencies.",
  minutes: 8,
  order: 75,
  objectives: ["Confidence is a forecast: explain the core mechanism in your own words.", "Cross-entropy rewards honest probability: connect the mechanism to a measurable tradeoff.", "Calibration is a deployment property: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
