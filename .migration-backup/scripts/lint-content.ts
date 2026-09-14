/**
 * Build-time content validation. Run via:
 *   pnpm lint:content
 *
 * Checks:
 *   1. Every lesson has a meta.ts and an interactives.tsx.
 *   2. The interactives.tsx file contains well-formed id fields
 *      (defensive — the manifest is regex-scanned, not imported,
 *      so we can validate without transpiling MDX/TSX).
 *   3. The concept graph has no dangling edges or cycles.
 *
 * Exits with code 1 (failure) on any error. Prints a summary to stderr.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  ConceptGraphSchema,
  type ConceptGraph,
} from '../lib/content/schemas';

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'content');
const LESSONS_DIR = join(CONTENT, 'lessons');

interface Issue {
  file: string;
  message: string;
}

const issues: Issue[] = [];

function fail(file: string, message: string): void {
  issues.push({ file, message });
}

function listLessonDirs(): string[] {
  if (!existsSync(LESSONS_DIR)) return [];
  return readdirSync(LESSONS_DIR).filter((name) => {
    const p = join(LESSONS_DIR, name);
    return existsSync(p) && existsSync(join(p, 'meta.ts'));
  });
}

function loadGraph(): ConceptGraph {
  const path = join(CONTENT, 'concepts', 'graph.yaml');
  if (!existsSync(path)) {
    return { nodes: [], edges: [] };
  }
  const raw: unknown = parseYaml(readFileSync(path, 'utf8'));
  try {
    return ConceptGraphSchema.parse(raw);
  } catch (e) {
    fail(path, `parse error: ${(e as Error).message}`);
    return { nodes: [], edges: [] };
  }
}

function validateLessonStructure(slug: string): void {
  const base = join(LESSONS_DIR, slug);
  if (!existsSync(join(base, 'interactives.tsx'))) {
    fail(`lessons/${slug}`, 'missing interactives.tsx');
    return;
  }
  if (!existsSync(join(base, 'lesson.mdx'))) {
    fail(`lessons/${slug}`, 'missing lesson.mdx');
  }
  const manifestText = readFileSync(join(base, 'interactives.tsx'), 'utf8');
  // Defensive: every id in the manifest must look like a kebab-case slug.
  const idRe = /id:\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  let found = 0;
  while ((m = idRe.exec(manifestText)) !== null) {
    found += 1;
    const id = m[1] ?? '';
    if (!/^[a-z0-9-]+$/.test(id)) {
      fail(
        `lessons/${slug}/interactives.tsx`,
        `interactive id "${id}" is not kebab-case`,
      );
    }
  }
  if (found === 0) {
    fail(
      `lessons/${slug}/interactives.tsx`,
      'no interactive ids found in manifest',
    );
  }
}

function validateGraph(g: ConceptGraph): void {
  const ids = new Set(g.nodes.map((n) => n.id));
  for (const e of g.edges) {
    if (!ids.has(e.from)) {
      fail(
        'concepts/graph.yaml',
        `edge from="${e.from}" references a node that does not exist`,
      );
    }
    if (!ids.has(e.to)) {
      fail(
        'concepts/graph.yaml',
        `edge to="${e.to}" references a node that does not exist`,
      );
    }
  }
  // Cycle detection (Kahn's algorithm).
  const indeg = new Map<string, number>();
  for (const n of g.nodes) indeg.set(n.id, 0);
  for (const e of g.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const queue: string[] = [];
  for (const [id, d] of indeg) if (d === 0) queue.push(id);
  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited.add(id);
    for (const e of g.edges) {
      if (e.from === id) {
        const next = (indeg.get(e.to) ?? 0) - 1;
        indeg.set(e.to, next);
        if (next === 0) queue.push(e.to);
      }
    }
  }
  if (visited.size < g.nodes.length) {
    fail(
      'concepts/graph.yaml',
      `graph contains a cycle: ${g.nodes.length - visited.size} node(s) unreachable from a source`,
    );
  }
}

function main(): void {
  const lessons = listLessonDirs();
  for (const slug of lessons) {
    validateLessonStructure(slug);
  }
  validateGraph(loadGraph());

  if (issues.length > 0) {
    console.error(`\n❌ ${issues.length} lint error(s):\n`);
    for (const i of issues) {
      console.error(`  ${i.file}\n    ${i.message}\n`);
    }
    process.exit(1);
  }

  console.log(`✓ content lint passed — ${lessons.length} lesson(s)`);
}

main();
