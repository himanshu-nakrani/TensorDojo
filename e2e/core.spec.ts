import { expect, test } from '@playwright/test';

test('home route renders the curriculum shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Learn AI the way scientists learn/i })).toBeVisible();
  await expect(page.getByText('58', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Browse the curriculum/i })).toBeVisible();
});

test('unknown lesson routes render the not-found page', async ({ page }) => {
  await page.goto('/lessons/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Lost?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /← Home/i })).toBeVisible();
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
});
