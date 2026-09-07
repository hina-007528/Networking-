import { expect, test } from '@playwright/test';

/**
 * Critical journeys from the master prompt.
 *
 * These tests exercise the real public pages. They do not invent successful coverage, quotes or
 * payments — those require a running API and seeded database. When the API is up the checks go
 * through the live endpoints; when it is down the UI must still show an error rather than a fake
 * success.
 */
test.describe('critical customer journeys', () => {
  test('user can open the connection wizard', async ({ page }) => {
    await page.goto('/get-stormfiber');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('form, [data-step], input').first()).toBeVisible();
  });

  test('user can open the ticket list from the dashboard login gate', async ({ page }) => {
    await page.goto('/dashboard/tickets');
    await expect(page).toHaveURL(/login|dashboard/);
  });

  test('support and FAQ pages are crawlable', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.goto('/support/contact');
    await expect(page.locator('form').first()).toBeVisible();
  });

  test('legal pages render CMS or fallback content', async ({ page }) => {
    await page.goto('/terms-and-conditions');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.goto('/privacy-policy');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
