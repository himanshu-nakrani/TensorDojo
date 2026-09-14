#!/usr/bin/env node
/**
 * Capture screenshots of a single route (or list of routes) in both
 * dark and light themes. Usage:
 *
 *   tsx scripts/screenshot-route.ts <outDir> <route1> [route2 ...]
 *
 * Examples:
 *   tsx scripts/screenshot-route.ts docs/screenshots/before-regularization /map
 *   tsx scripts/screenshot-route.ts docs/screenshots/after-regularization / /map /lessons/overfitting
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWPORT = { width: 1440, height: 900 } as const;
const THEME_SETTLE_MS = 800;

async function setTheme(page: Page, theme: 'dark' | 'light') {
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

function nameForRoute(route: string): string {
  if (route === '/' || route === '') return '01-home';
  // /lessons/<slug> -> lessons-<slug>
  const m = /^\/lessons\/(.+)$/.exec(route);
  if (m) return `lessons-${m[1]}`;
  // /map -> map
  return route.replace(/^\//, '').replace(/\//g, '-');
}

async function main() {
  const outDir = process.argv[2];
  const routes = process.argv.slice(3);
  if (!outDir || routes.length === 0) {
    console.error('Usage: tsx scripts/screenshot-route.ts <outDir> <route1> [route2 ...]');
    process.exit(1);
  }
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
  await mkdir(join(outDir, 'dark'), { recursive: true });
  await mkdir(join(outDir, 'light'), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  });

  let count = 0;
  for (const r of routes) {
    const url = `${baseUrl}${r}`;
    const name = nameForRoute(r);
    for (const theme of ['dark', 'light'] as const) {
      const outPath = join(outDir, theme, `${name}.png`);
      process.stdout.write(`[${++count}] ${theme} ${name} … `);
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await setTheme(page, theme);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise((res) => setTimeout(res, THEME_SETTLE_MS));
        await page.screenshot({ path: outPath as `${string}.png`, fullPage: false });
        console.log('ok');
      } catch (err) {
        console.log('FAIL', err instanceof Error ? err.message : err);
      } finally {
        await page.close();
      }
    }
  }
  await browser.close();
  console.log(`Done. ${count} screenshots.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
