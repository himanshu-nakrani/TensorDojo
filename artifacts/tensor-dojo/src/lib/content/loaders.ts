/**
 * Client-side content loaders. YAML files are imported as raw text
 * and parsed at runtime using the yaml package.
 */
import { parse as parseYaml } from 'yaml';
import {
  ConceptGraphSchema,
  type ConceptGraph,
} from './schemas';

// Vite ?raw imports for YAML content
// @ts-ignore
import graphYamlText from '@/content/concepts/graph.yaml?raw';

let conceptGraphCache: ConceptGraph | null = null;

/** Load and validate the concept graph. */
export function loadConceptGraph(): ConceptGraph {
  if (conceptGraphCache !== null) return conceptGraphCache;
  const parsed: unknown = parseYaml(graphYamlText);
  const validated: ConceptGraph = ConceptGraphSchema.parse(parsed);
  conceptGraphCache = validated;
  return conceptGraphCache;
}
