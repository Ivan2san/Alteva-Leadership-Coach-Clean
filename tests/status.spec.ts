import { test, expect } from '@playwright/test';

test('prod homepage responds', async ({ page }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:4173';
  const resp = await page.goto(base + '/');
  expect(resp, 'page.goto() response').toBeTruthy();
  expect(resp!.status(), 'HTTP status').toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
  // Don’t assume auth state; just ensure the page renders something
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(0);
});
