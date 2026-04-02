import { test, expect } from '@playwright/test';

test.describe('Portal Auth', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/portal/questionnaire/any-id');
    await expect(page).toHaveURL('/portal/login');
  });

  test('login page renders email form', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Zugangslink anfordern');
  });

  test('datenschutz page is publicly accessible', async ({ page }) => {
    await page.goto('/portal/datenschutz');
    await expect(page.locator('h1')).toContainText('Datenschutzhinweis');
  });

  test('index page renders and links to portal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Software Crafting');
    const portalLink = page.locator('a[href="/portal/login"]');
    await expect(portalLink).toBeVisible();
  });

  test('open redirect prevention — next param must start with /portal/', async ({ page }) => {
    // Attempting to use next param with external URL should redirect to /portal/login
    await page.goto('/portal/login?next=https://evil.com');
    await expect(page).toHaveURL('/portal/login');
  });
});
