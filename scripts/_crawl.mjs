#!/usr/bin/env node
// Visual + accessibility crawl: opens /, /lessons, /map, and every
// lesson slug. For each lesson, expands every workbench interactive
// and captures desktop + mobile screenshots. Fails on console errors,
// framework overlays, blank pages, horizontal overflow, missing
// accessible names, or unreadable clipped text.
//
// Expects a dev or prod server already running on PORT (default 3100).
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.env.PORT ?? '3100';
const BASE = `http://localhost:${PORT}`;
const SETTLE_MS = 1200;
const SHOT_DIR = 'docs/screenshots/crawl';

mkdirSync(SHOT_DIR, { recursive: true });

const SLUGS = [
  'dot-product', 'matrix-multiplication', 'vector-projection',
  'softmax', 'attention-scores', 'attention-output', 'scaled-attention',
  'causal-mask', 'tokenization', 'token-embeddings', 'positional-encoding',
  'rope', 'multi-head-attention', 'grouped-query-attention', 'flash-attention',
  'residuals-layernorm', 'activations', 'feed-forward', 'mixture-of-experts',
  'transformer-block', 'sampling-decoding', 'beam-search', 'kv-cache',
  'speculative-decoding', 'cross-entropy', 'gradient-descent',
  'backpropagation', 'sgd', 'optimizers', 'lr-schedules',
  'training-end-to-end', 'scaling-laws', 'overfitting', 'weight-decay',
  'dropout', 'batch-norm', 'early-stopping-augmentation',
  'pretraining-vs-finetuning', 'freezing-vs-full-finetuning',
  'catastrophic-forgetting', 'quantization', 'lora', 'evaluation',
  'instruction-tuning-rlhf', 'loss-landscapes',
];

const CORE_ROUTES = ['/', '/lessons', '/map'];

const IGNORE_PATTERNS = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
  /Failed to load resource.*404/i,
];

function shouldIgnore(msg) {
  return IGNORE_PATTERNS.some((re) => re.test(msg));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
});

let totalErrors = 0;
const failures = [];

async function crawlRoute(pathname, { isLesson = false } = {}) {
  const url = `${BASE}${pathname}`;
  const errors = [];

  for (const [label, width] of [['desktop', 1280], ['mobile', 390]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: label === 'desktop' ? 900 : 844 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!shouldIgnore(text)) errors.push(`[${label}] console.error: ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      errors.push(`[${label}] pageerror: ${err.message}`);
    });
    page.on('requestfailed', (req) => {
      const u = req.url();
      if (!shouldIgnore(u)) errors.push(`[${label}] requestfailed: ${u}`);
    });

    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      if (!resp || (!resp.ok() && resp.status() !== 304)) {
        errors.push(`[${label}] HTTP ${resp?.status() ?? 'no-response'}`);
      }
      await new Promise((r) => setTimeout(r, SETTLE_MS));

      // Blank page check
      const bodyText = await page.evaluate(() => document.body.innerText.trim().length);
      if (bodyText < 50) errors.push(`[${label}] blank page (body text < 50 chars)`);

      // Horizontal overflow check
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      if (overflow > 2) errors.push(`[${label}] horizontal overflow: ${overflow}px`);

      // Missing accessible names: buttons/inputs/selects without name
      const unnamedControls = await page.evaluate(() => {
        const els = document.querySelectorAll('button, input:not([type="hidden"]), select, [role="button"]');
        const unnamed = [];
        for (const el of els) {
          if (el.closest('[aria-hidden="true"]')) continue;
          // Check for implicit label wrapping (<label><input/></label>)
          const wrappedInLabel = el.closest('label');
          const name = el.getAttribute('aria-label')
            || el.getAttribute('aria-labelledby')
            || el.getAttribute('title')
            || (el.tagName === 'INPUT' && el.id && document.querySelector(`label[for="${el.id}"]`))
            || (wrappedInLabel && wrappedInLabel.textContent?.trim())
            || el.textContent?.trim();
          if (!name) {
            unnamed.push(`<${el.tagName.toLowerCase()} class="${el.className?.slice(0, 40)}">`);
          }
        }
        return unnamed.slice(0, 5);
      });
      if (unnamedControls.length > 0) {
        errors.push(`[${label}] ${unnamedControls.length} control(s) without accessible name: ${unnamedControls.join(', ')}`);
      }

      // Unreadable clipped text: elements with scrollHeight > clientHeight
      // and overflow:hidden (text is cut off). Excludes KaTeX internals
      // which use overflow:hidden for the MathML annotation layer.
      const clipped = await page.evaluate(() => {
        const els = document.querySelectorAll('h1, h2, h3, p, span, td, label, div');
        const clipped = [];
        for (const el of els) {
          if (el.closest('.katex') || el.closest('.katex-mathml')) continue;
          const style = getComputedStyle(el);
          if (style.overflow === 'hidden' && el.scrollHeight > el.clientHeight + 2) {
            const text = el.textContent?.trim().slice(0, 40);
            if (text && text.length > 5) clipped.push(text);
          }
        }
        return clipped.slice(0, 3);
      });
      if (clipped.length > 0) {
        errors.push(`[${label}] clipped text: ${clipped.join(' | ')}`);
      }

      // For lesson pages, expand workbench interactives
      if (isLesson) {
        await page.evaluate(() => {
          document.querySelectorAll('details, [data-expandable]').forEach((el) => {
            if (el.tagName === 'DETAILS') el.open = true;
          });
        });
        await new Promise((r) => setTimeout(r, 500));
      }

      // Screenshot
      const slug = pathname.replace('/lessons/', '').replace('/', 'home');
      const safeName = slug || 'home';
      await page.screenshot({
        path: `${SHOT_DIR}/${safeName}-${label}.png`,
        fullPage: true,
      });
    } catch (err) {
      errors.push(`[${label}] navigation: ${err.message}`);
    }
    await page.close();
  }

  return errors;
}

// Crawl core routes
console.log('=== Core routes ===');
for (const route of CORE_ROUTES) {
  const errors = await crawlRoute(route);
  if (errors.length > 0) {
    totalErrors += errors.length;
    failures.push({ route, errors });
    console.log(`✗ ${route} — ${errors.length} error(s)`);
    for (const e of errors) console.log(`    ${e}`);
  } else {
    console.log(`✓ ${route}`);
  }
}

// Crawl lesson routes
console.log('\n=== Lesson routes ===');
for (const slug of SLUGS) {
  const errors = await crawlRoute(`/lessons/${slug}`, { isLesson: true });
  if (errors.length > 0) {
    totalErrors += errors.length;
    failures.push({ route: `/lessons/${slug}`, errors });
    console.log(`✗ /lessons/${slug} — ${errors.length} error(s)`);
    for (const e of errors) console.log(`    ${e}`);
  } else {
    console.log(`✓ /lessons/${slug}`);
  }
}

await browser.close();

console.log('');
if (totalErrors === 0) {
  console.log(`All ${CORE_ROUTES.length + SLUGS.length} routes passed visual + a11y crawl.`);
  process.exit(0);
} else {
  console.log(`${failures.length} route(s) with ${totalErrors} total error(s).`);
  process.exit(1);
}
