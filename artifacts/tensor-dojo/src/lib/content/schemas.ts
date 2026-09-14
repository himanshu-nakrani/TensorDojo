/**
 * Zod schemas for all YAML content. Validated at build time by the
 * `lint:content` script and at runtime by the loaders in lib/content/*.
 */
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Concept graph
// -----------------------------------------------------------------------------

export const ConceptNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, {
      message: 'concept ids must be kebab-case (lowercase, digits, hyphens)',
    }),
  title: z.string().min(1),
  /** Optional lesson slug that teaches this concept. */
  lesson: z.string().optional(),
});
export type ConceptNode = z.infer<typeof ConceptNodeSchema>;

export const ConceptEdgeSchema = z.object({
  /** Prerequisite concept id. */
  from: z.string().min(1),
  /** Dependent concept id. */
  to: z.string().min(1),
});
export type ConceptEdge = z.infer<typeof ConceptEdgeSchema>;

export const ConceptGraphSchema = z.object({
  nodes: z.array(ConceptNodeSchema).min(1),
  edges: z.array(ConceptEdgeSchema),
});
export type ConceptGraph = z.infer<typeof ConceptGraphSchema>;
