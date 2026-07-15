#!/usr/bin/env node
/**
 * Capture screenshots of every lesson + home, in both dark and light themes.
 *
 * Usage: tsx scripts/screenshot.ts <outDir> [baseUrl]
 *
 *   outDir  — e.g. docs/screenshots/before-final-polish
 *   baseUrl — default http://localhost:3000
 *
 * The script writes one PNG per (route, theme) into outDir/{dark,light}/.
 *   - 01-home.png
 *   - lessons-<slug>.png
 *
 * Viewport: 1440×900 @ 1x (per the brief).
 * Theme: set via localStorage['tld-theme'] AND documentElement.classList
 * (the app's inline bootstrap reads localStorage first; we set both so
 * the page paints the right theme before the bootstrap runs).
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { listLessonSlugs } from '../lib/lessons-meta';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWPORT = { width: 1440, height: 900 } as const;
const THEME_SETTLE_MS = 800; // wait for theme tokens to apply

async function withPage<T>(browser: Browser, fn: (p: Page) => Promise<T>): Promise<T> {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function setTheme(page: Page, theme: 'dark' | 'light') {
  // Set localStorage at the right origin, then reload so the inline
  // bootstrap reads it and paints the right theme before the first frame.
  await page.evaluate((t) => {
    try {
      window.localStorage.setItem('tld-theme', t);
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.add('theme-switching');
  }, theme);
  await new Promise((r) => setTimeout(r, 50));
}

async function captureRoute(
  browser: Browser,
  url: string,
  outPath: string,
  theme: 'dark' | 'light',
) {
  await withPage(browser, async (page) => {
    // First load: just to set localStorage at this origin.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await setTheme(page, theme);
    // Reload so the inline bootstrap applies the persisted theme.
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, THEME_SETTLE_MS));
    await page.screenshot({ path: outPath as `${string}.png`, fullPage: false });
  });
}

async function main() {
  const outDir = process.argv[2];
  const baseUrl = process.argv[3] ?? 'http://localhost:3000';
  if (!outDir) {
    console.error('Usage: tsx scripts/screenshot.ts <outDir> [baseUrl]');
    process.exit(1);
  }
  await mkdir(join(outDir, 'dark'), { recursive: true });
  await mkdir(join(outDir, 'light'), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  });

  const slugs = listLessonSlugs();
  const targets: Array<{ url: string; name: string }> = [
    { url: `${baseUrl}/`, name: '01-home' },
    ...slugs.map((s) => ({ url: `${baseUrl}/lessons/${s}`, name: `lessons-${s}` })),
  ];

  let count = 0;
  for (const t of targets) {
    for (const theme of ['dark', 'light'] as const) {
      const outPath = join(outDir, theme, `${t.name}.png`);
      process.stdout.write(`[${++count}/${targets.length * 2}] ${theme} ${t.name} … `);
      try {
        await captureRoute(browser, t.url, outPath, theme);
        console.log('ok');
      } catch (err) {
        console.log('FAIL', err instanceof Error ? err.message : err);
      }
    }
  }
  await browser.close();
  console.log(`Done. ${count} screenshots written to ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
