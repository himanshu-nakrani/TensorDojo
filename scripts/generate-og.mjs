/**
 * Generates artifacts/tensor-dojo/public/og.png — the 1200×630 social
 * card unfurled by Twitter/X, Slack, iMessage, HN, etc.
 *
 * Renders a self-contained HTML brand card in headless Chromium
 * (already a devDependency for e2e) and screenshots it. Run:
 *
 *   node scripts/generate-og.mjs
 *
 * Re-run whenever the logo, tagline, or palette changes.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'artifacts/tensor-dojo/public/og.png');

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,600&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #141414;
    color: #ececec;
    font-family: 'IBM Plex Sans', sans-serif;
    position: relative;
    padding: 72px 88px;
    display: flex;
    flex-direction: column;
  }
  /* faint graph-paper grid, matching the app's lab-notebook texture */
  body::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  /* accent glow behind the figure */
  body::after {
    content: '';
    position: absolute;
    right: -140px; top: -180px;
    width: 640px; height: 640px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(233,138,102,0.14), transparent 65%);
  }
  .brand {
    display: flex; align-items: center; gap: 16px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 22px; font-weight: 600; letter-spacing: 0.04em;
    position: relative; z-index: 1;
  }
  .title {
    font-family: 'IBM Plex Sans', sans-serif;
    font-weight: 600;
    font-size: 78px; line-height: 1.06; letter-spacing: -0.025em;
    color: #ececec;
    margin-top: auto;
    max-width: 760px;
    position: relative; z-index: 1;
  }
  .title em { color: #e98a66; font-style: italic; font-weight: 600; }
  .sub {
    margin-top: 26px;
    font-size: 26px; color: #9b9b9b; max-width: 640px; line-height: 1.5;
    position: relative; z-index: 1;
  }
  .stats {
    display: flex; gap: 40px; margin-top: auto;
    font-family: 'IBM Plex Mono', monospace;
    position: relative; z-index: 1;
  }
  .stat b { display: block; font-size: 34px; color: #ececec; font-weight: 600; }
  .stat span { font-size: 17px; color: #8a8a8a; text-transform: lowercase; }
  .fig {
    position: absolute; z-index: 1;
    right: 96px; top: 168px;
    width: 320px; height: 320px;
    background: #1f1f1f;
    border: 1px solid #2e2e2e;
    border-radius: 4px 16px 16px 4px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.45);
    overflow: hidden;
  }
  .fig::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
    background: linear-gradient(180deg, #e98a66, rgba(233,138,102,0.5));
  }
  .fig .cap {
    position: absolute; top: 18px; left: 24px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #8a8a8a;
  }
</style>
</head>
<body>
  <div class="brand">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M19.2 4.8 L21.4 12.6 L13.6 19.2 L4.8 19.2 Z" fill="#e98a66" opacity="0.16"/>
      <path d="M4.8 19.2 L19.2 4.8" stroke="#f1f5f9" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M4.8 19.2 L13.6 19.2" stroke="#f1f5f9" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
      <circle cx="19.2" cy="4.8" r="2.3" fill="#e98a66"/>
      <circle cx="4.8" cy="19.2" r="1.5" fill="#f1f5f9"/>
    </svg>
    tensor dojo
  </div>

  <div class="fig">
    <div class="cap">Fig. 1 · dot product</div>
    <svg width="320" height="320" viewBox="0 0 320 320">
      <g stroke="#334155" stroke-width="1">
        <line x1="40" y1="280" x2="296" y2="280"/>
        <line x1="40" y1="280" x2="40" y2="56"/>
        <line x1="40" y1="168" x2="296" y2="168" stroke-dasharray="3 5" opacity="0.5"/>
        <line x1="168" y1="280" x2="168" y2="56" stroke-dasharray="3 5" opacity="0.5"/>
      </g>
      <path d="M40 280 L252 96 L252 280 Z" fill="#3b82f6" opacity="0.10"/>
      <line x1="40" y1="280" x2="252" y2="96" stroke="#22d3ee" stroke-width="4" stroke-linecap="round"/>
      <line x1="40" y1="280" x2="150" y2="238" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      <circle cx="252" cy="96" r="11" fill="#22d3ee"/>
      <circle cx="150" cy="238" r="11" fill="#f59e0b"/>
      <text x="264" y="92" fill="#67e8f9" font-family="IBM Plex Mono" font-size="20">a</text>
      <text x="156" y="264" fill="#fbbf24" font-family="IBM Plex Mono" font-size="20">b</text>
      <text x="120" y="140" fill="#e2e8f0" font-family="IBM Plex Mono" font-size="19">a·b = 3.62</text>
    </svg>
  </div>

  <h1 class="title">Learn how LLMs work by <em>manipulating them.</em></h1>
  <p class="sub">Every concept is something you can drag, edit, or step through — with the math underneath you can read.</p>

  <div class="stats">
    <div class="stat"><b>80</b><span>lessons</span></div>
    <div class="stat"><b>10</b><span>tracks</span></div>
    <div class="stat"><b>98</b><span>live sims</span></div>
    <div class="stat"><b>0</b><span>backend deps</span></div>
  </div>
</body>
</html>`;

// Launch whatever Chromium this Playwright version can find: try the
// default (headless shell) first, then any full Chromium build already
// in the local ms-playwright cache.
async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (err) {
    const cache = path.join(
      process.env.HOME ?? '',
      'Library/Caches/ms-playwright',
    );
    const { readdirSync, existsSync } = await import('node:fs');
    const candidates = [];
    try {
      for (const dir of readdirSync(cache).sort().reverse()) {
        candidates.push(
          path.join(cache, dir, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
          path.join(cache, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
          path.join(cache, dir, 'chrome-headless-shell-mac/chrome-headless-shell'),
          path.join(cache, dir, 'chrome-linux/headless_shell'),
        );
      }
    } catch {
      /* no cache — rethrow the original error below */
    }
    const fallback = candidates.find((p) => existsSync(p));
    if (!fallback) throw err;
    return await chromium.launch({ executablePath: fallback });
  }
}
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  // Give webfonts a moment even if networkidle already fired.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, type: 'png' });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
