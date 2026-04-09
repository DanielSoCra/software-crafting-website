import { test, expect } from '@playwright/test';

test.describe('Deliverables Route', () => {
  test('unauthenticated access redirected to login', async ({ page }) => {
    await page.goto('/portal/deliverables/analysis');
    await expect(page).toHaveURL('/portal/login');
  });

  test('invalid deliverable type returns 404 or redirect', async ({ page }) => {
    await page.goto('/portal/deliverables/invalid-type');
    // Unauthenticated → redirects to login
    await expect(page).toHaveURL('/portal/login');
  });

  test('datenschutz page still publicly accessible', async ({ page }) => {
    await page.goto('/portal/datenschutz');
    await expect(page.locator('h1')).toContainText('Datenschutzhinweis');
  });

  // Path traversal tests (require --path-as-is for accurate testing)
  // Manual test: curl --path-as-is "https://software-crafting.de/portal/deliverables/analysis/..%2f..%2fetc%2fpasswd"
  // Expected: 403 or redirect to login

  // Authenticated tests require Supabase fixtures
  // Manual acceptance test checklist:
  // 1. Published analysis → shows file list from metadata
  // 2. Published mood-board → shows variant grid
  // 3. Published brand-guide → renders markdown as HTML
  // 4. Published website-preview → iframes index.html
  // 5. Published proposal → embeds PDF
  // 6. Unpublished type → 404
  // 7. First view sets viewed_at + status='viewed'
  // 8. Admin with ?client= can view other client's deliverables
});
