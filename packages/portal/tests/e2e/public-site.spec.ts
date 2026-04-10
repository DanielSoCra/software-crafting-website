import { test, expect } from '@playwright/test';

test.describe('Public Site Integration', () => {
  test('root URL serves public site, not portal', async ({ page }) => {
    const response = await page.goto('/');
    // Should be 200 and NOT powered by Next.js
    expect(response?.status()).toBe(200);
    const poweredBy = response?.headers()['x-powered-by'];
    // Next.js sets x-powered-by: Next.js; Astro doesn't set this header
    expect(poweredBy).not.toBe('Next.js');
  });

  test('footer datenschutz link from portal goes to public site', async ({ page }) => {
    await page.goto('/portal/login');
    const dsLink = page.getByRole('link', { name: /Datenschutz/i }).first();
    await expect(dsLink).toHaveAttribute('href', '/datenschutz');
  });
});
