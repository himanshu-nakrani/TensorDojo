/**
 * Server-side content loaders. YAML files are read at build time and
 * validated with zod schemas. Loaded once per build (or once per page
 * render in dev) and cached at the module level.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  ConceptGraphSchema,
  type ConceptGraph,
} from './schemas';

const CONTENT_ROOT = join(process.cwd(), 'content');

let conceptGraphCache: ConceptGraph | null = null;
/** Load and validate the concept graph. */
export function loadConceptGraph(): ConceptGraph {
  if (conceptGraphCache !== null) return conceptGraphCache;
  const path = join(CONTENT_ROOT, 'concepts', 'graph.yaml');
  if (!existsSync(path)) {
    conceptGraphCache = { nodes: [], edges: [] };
    return conceptGraphCache;
  }
  const text = readFileSync(path, 'utf8');
  const parsed: unknown = parseYaml(text);
  const validated: ConceptGraph = ConceptGraphSchema.parse(parsed);
  conceptGraphCache = validated;
  return conceptGraphCache;
}
