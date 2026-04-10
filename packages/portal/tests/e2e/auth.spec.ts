import { test, expect } from '@playwright/test';

test.describe('Portal Auth', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/portal/dashboard');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('login page renders email form', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page.getByLabel(/E-Mail-Adresse/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Anmelde-Link anfordern/i })
    ).toBeVisible();
  });

  test('login page shows error from query param', async ({ page }) => {
    await page.goto(
      '/portal/login?error=otp_error&error_description=Der+Link+ist+leider+abgelaufen.'
    );
    await expect(page.getByText(/abgelaufen/i)).toBeVisible();
  });

  test('portal root redirects to login', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('auth/confirm with invalid token_hash redirects to login with error', async ({ page }) => {
    await page.goto('/portal/auth/confirm?token_hash=invalid&type=magiclink');
    await expect(page).toHaveURL(/\/portal\/login\?error=/);
  });
});
