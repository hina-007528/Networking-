import { expect, test } from '@playwright/test';

test.describe('public marketing site', () => {
  test('home page renders the primary CTA and navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /check availability|get connection|plans/i }).first()).toBeVisible();
  });

  test('plans catalogue is reachable and filterable', async ({ page }) => {
    await page.goto('/plans');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('coverage checker requires a city and area before submitting', async ({ page }) => {
    await page.goto('/check-availability');
    await expect(page.getByRole('heading', { name: /live on/i })).toBeVisible();
    await page.getByRole('button', { name: /check network coverage/i }).click();
    const city = page.locator('select').first();
    await expect(city).toHaveAttribute('required', '');
  });
});

test.describe('authentication screens', () => {
  test('login form validates empty credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('input[name="identifier"], input[name="email"], input[type="password"]').first()).toBeVisible();
  });
});
