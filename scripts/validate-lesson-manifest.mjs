import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..', 'artifacts', 'tensor-dojo');
const srcRoot = path.join(appRoot, 'src');
const lessonsRoot = path.join(srcRoot, 'content', 'lessons');

const lessonSlugs = fs
  .readdirSync(lessonsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const requiredFiles = ['meta.ts', 'interactives.tsx', 'lesson.mdx'];
const errors = [];

for (const slug of lessonSlugs) {
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(lessonsRoot, slug, file))) {
      errors.push(`${slug}: missing content/lessons/${slug}/${file}`);
    }
  }
}

function readSource(file) {
  return fs.readFileSync(path.join(srcRoot, 'lib', file), 'utf8');
}

function importedSlugs(source) {
  return new Set([...source.matchAll(/content\/lessons\/([a-z0-9-]+)\//g)].map((match) => match[1]));
}

const registries = {
  'lessons.ts': importedSlugs(readSource('lessons.ts')),
  'lesson-manifest.ts': importedSlugs(readSource('lesson-manifest.ts')),
  'lessons-meta.ts': importedSlugs(readSource('lessons-meta.ts')),
};

const expected = new Set(lessonSlugs);
for (const [name, actual] of Object.entries(registries)) {
  for (const slug of lessonSlugs) {
    if (!actual.has(slug)) errors.push(`${name}: missing registration for ${slug}`);
  }
  for (const slug of actual) {
    if (!expected.has(slug)) errors.push(`${name}: references unknown lesson ${slug}`);
  }
}

const metaSource = readSource('lessons-meta.ts');
const metadataSlugCount = (metaSource.match(/content\/lessons\/([a-z0-9-]+)\/meta/g) ?? []).length;
if (metadataSlugCount !== lessonSlugs.length) {
  errors.push(`lessons-meta.ts: found ${metadataSlugCount} metadata imports for ${lessonSlugs.length} lesson directories`);
}

if (errors.length > 0) {
  console.error(`Lesson manifest validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Lesson manifest valid: ${lessonSlugs.length} lessons, ${requiredFiles.length} required files each, and ${Object.keys(registries).length} registries synchronized.`);
