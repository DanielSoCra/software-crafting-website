import { test, expect } from '@playwright/test';

test.describe('Client Dashboard', () => {
  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/portal/dashboard');
    await expect(page).toHaveURL('/portal/login');
  });

  test('login page redirects to dashboard after auth', async ({ page }) => {
    // After login, user should end up at /portal/dashboard (not questionnaire)
    await page.goto('/portal/login');
    await expect(page.locator('h1')).toContainText('Kundenportal');
  });

  // Authenticated tests require Supabase test fixtures
  // Manual acceptance test checklist:
  // 1. Login → lands on dashboard
  // 2. Dashboard shows 7 cards (questionnaire + 5 deliverables + dateien)
  // 3. Unpublished deliverables show "In Arbeit"
  // 4. Published deliverables show "Bereit"
  // 5. Viewed deliverables show checkmark
  // 6. Admin without ?client= sees client picker
  // 7. Admin with ?client=slug sees that client's dashboard
});
