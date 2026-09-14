import { expect, test } from '@playwright/test';

test('home route renders the curriculum shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Learn AI the way scientists learn/i })).toBeVisible();
  await expect(page.getByText(/80 interactive lessons/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Browse the curriculum/i })).toBeVisible();
});

test('new systems lesson route renders its assessment and workbench', async ({ page }) => {
  await page.goto('/lessons/data-pipeline');
  await expect(page.getByRole('heading', { name: /Data pipelines: the model only learns what arrives/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /The input to training is a stream/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Data Budget Lab/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Check answer/i })).toBeVisible();
  await expect(page.getByText(/The central idea is data pipelines/i)).toBeVisible();
});

test('unknown lesson routes render the not-found page', async ({ page }) => {
  await page.goto('/lessons/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Lost?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /← Home/i })).toBeVisible();
});

test('zero-attempt mastery records are not shown as mastered', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tld-mastery', JSON.stringify({
      'activations.swiglu-zero-gate': { correct: true, attempts: 0, lastAttemptAt: Date.now() },
    }));
  });
  await page.goto('/lessons/activations');
  await expect(page.getByRole('heading', { name: /If a = 0 in SwiGLU/i })).toBeVisible();
  await expect(page.getByText(/Mastered ·/i)).toHaveCount(0);
});

test('shareable interactive state reopens the requested workbench panel', async ({ page }) => {
  await page.goto('/lessons/activations?interactive=swiglu-gate');
  const panel = page.getByRole('button', { name: /SwiGLU: silu\(a\) gates b/i });
  await expect(panel).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /Copy lesson link/i })).toBeVisible();
});

test('continuous-batching lesson exposes occupancy control', async ({ page }) => {
  await page.goto('/lessons/continuous-batching');
  await expect(page.getByRole('heading', { name: /Continuous batching/i })).toBeVisible();
  await expect(page.getByRole('slider', { name: /occupancy/i })).toBeVisible();
});

test('activation lesson loads the assessment and feedback loop', async ({ page }) => {
  await page.goto('/lessons/activations');
  await expect(page.getByRole('heading', { name: /Activations: the bend/i })).toBeVisible();

  const question = page.getByRole('heading', { name: /If a = 0 in SwiGLU/i });
  await expect(question).toBeVisible();

  const answer = page.getByRole('radio', { name: /It becomes 0, regardless of b/i });
  await answer.focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: /Check answer/i }).click();

  const feedback = page.locator('[role="status"]').filter({ hasText: 'Correct.' });
  await expect(feedback).toContainText('Correct.');
  await expect(feedback).toContainText('SiLU(0) = 0');
  await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Mastered · 1 attempt/i)).toBeVisible();
});
