import { expect, test } from '@playwright/test';

/**
 * Visual regression + launch-polish smoke tests.
 *
 * Screenshot baselines live in e2e/visual.spec.ts-snapshots/. Refresh
 * them intentionally after a design change:
 *
 *   pnpm run test:e2e -- --update-snapshots
 */

// Deterministic canvas: fixed viewport, no animations mid-flight.
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  // Dismiss the first-run onboarding card so screenshots are stable.
  await page.addInitScript(() => {
    localStorage.setItem('tld-onboarded', '1');
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.fonts.ready);
  // Outlast the hero's one-shot vector draw-in + readout count-up so
  // baselines capture the settled instrument, not mid-animation frames.
  await page.waitForTimeout(1400);
}

/**
 * Scroll the whole document once so IntersectionObserver-driven
 * `.reveal` sections play their entrance before a full-page capture.
 */
async function scrollThrough(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`home renders the lab-notebook landing (${theme})`, async ({ page }) => {
    await page.goto(`/?theme=${theme}`);
    await expect(page.getByRole('heading', { name: /Learn AI the way scientists learn/i })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(`home-${theme}.png`, {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test(`lesson page renders prose + workbench (${theme})`, async ({ page }) => {
    await page.goto(`/lessons/dot-product?theme=${theme}`);
    await expect(page.getByRole('heading', { name: /Dot product/i }).first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(`lesson-${theme}.png`, {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
}

test('home shows the full journey below the fold (light)', async ({ page }) => {
  await page.goto('/?theme=light');
  await settle(page);
  await scrollThrough(page);
  await expect(page).toHaveScreenshot('home-full-light.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});

test('hero rotator switches figures and pins on interaction', async ({ page }) => {
  await page.goto('/?theme=light');
  await expect(page.getByText('Fig. 1 · Dot product as alignment')).toBeVisible();

  const attentionTab = page.getByRole('tab', { name: 'Attention' });
  await attentionTab.click();
  await expect(page.getByText('Fig. 2 · Attention scores')).toBeVisible();
  await expect(page.getByText(/auto-cycling/)).toHaveCount(0);

  await page.getByRole('tab', { name: 'DPO loss' }).click();
  await expect(page.getByText('Fig. 3 · DPO loss surface')).toBeVisible();
});

test('completion flow: mark complete, nav ring, undo', async ({ page }) => {
  await page.goto('/lessons/dot-product');
  const markButton = page.getByRole('button', { name: 'Mark as complete' });
  await expect(markButton).toBeVisible();
  await markButton.click();

  await expect(page.getByText('Lesson complete')).toBeVisible();
  await expect(page.getByRole('link', { name: /1 of 80 lessons complete/ })).toBeVisible();

  // Progress persists across navigation.
  await page.goto('/lessons');
  await expect(page.getByText(/1 \/ 80 lessons complete/)).toBeVisible();

  // Track progress bar shows the completion on home.
  await page.goto('/');
  await expect(page.getByText(/1\/10 done|1\/3 done/)).toBeVisible();

  // Undo clears it.
  await page.goto('/lessons/dot-product');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Mark as complete' })).toBeVisible();
});

test('first-time visitor sees the onboarding card on lesson 01', async ({ page }) => {
  // Init scripts run in add order, so this removes what beforeEach set.
  await page.addInitScript(() => {
    localStorage.removeItem('tld-onboarded');
  });
  await page.goto('/lessons/dot-product');
  const dialog = page.getByRole('dialog', { name: /Nothing here is a picture/i });
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Start dragging' }).click();
  await expect(dialog).toHaveCount(0);

  // Remembered on the next visit.
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('lesson head carries route-specific meta', async ({ page }) => {
  await page.goto('/lessons/dot-product');
  await expect(page).toHaveTitle(/Dot product/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /og\.png$/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/lessons\/dot-product$/,
  );
});
