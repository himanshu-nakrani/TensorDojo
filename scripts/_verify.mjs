#!/usr/bin/env node
// Headless render-error sweep: load every lesson route and report
// any console errors, page errors, or failed requests. Expects a
// dev or prod server already running on PORT (default 3100).
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.env.PORT ?? '3100';
const BASE = `http://localhost:${PORT}`;
const SETTLE_MS = 1500;

const SLUGS = [
  'dot-product',
  'vector-projection',
  'softmax',
  'attention-scores',
  'attention-output',
  'scaled-attention',
  'tokenization',
  'token-embeddings',
  'positional-encoding',
  'causal-mask',
  'multi-head-attention',
  'residuals-layernorm',
  'feed-forward',
  'transformer-block',
  'sampling-decoding',
  'kv-cache',
  'cross-entropy',
  'gradient-descent',
  'backpropagation',
  'sgd',
  'optimizers',
  'lr-schedules',
  'training-end-to-end',
  'overfitting',
  'weight-decay',
  'dropout',
  'batch-norm',
  'early-stopping-augmentation',
  'pretraining-vs-finetuning',
  'freezing-vs-full-finetuning',
  'catastrophic-forgetting',
  'lora',
  'instruction-tuning-rlhf',
];

// React dev-mode warnings that aren't actionable for our purposes.
const IGNORE_PATTERNS = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  // The default favicon is missing site-wide; not a per-lesson concern.
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

let total = 0;
const failures = [];

for (const slug of SLUGS) {
  const url = `${BASE}/lessons/${slug}`;
  const page = await browser.newPage();
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!shouldIgnore(text)) errors.push(`console.error: ${text}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`);
  });
  page.on('response', (resp) => {
    if (resp.status() === 404 && !shouldIgnore(resp.url())) {
      errors.push(`404: ${resp.url()}`);
    }
  });

  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    if (!resp || !resp.ok()) {
      errors.push(`HTTP ${resp?.status() ?? 'no-response'}`);
    }
    // Let dynamic interactives mount.
    await new Promise((r) => setTimeout(r, SETTLE_MS));
  } catch (err) {
    errors.push(`navigation: ${err.message}`);
  }

  total += errors.length;
  if (errors.length > 0) {
    failures.push({ slug, errors });
    console.log(`✗ /lessons/${slug} — ${errors.length} error(s)`);
    for (const e of errors) console.log(`    ${e}`);
  } else {
    console.log(`✓ /lessons/${slug}`);
  }

  await page.close();
}

await browser.close();

console.log('');
if (total === 0) {
  console.log(`All ${SLUGS.length} lessons rendered without errors.`);
  process.exit(0);
} else {
  console.log(`${failures.length} lesson(s) with ${total} total error(s).`);
  process.exit(1);
}
