import { test, expect } from '@playwright/test';

/**
 * Access-control tests — verify the middleware + API guards refuse
 * unauthenticated callers. Cross-tenant coverage (client A accessing
 * client B's data with a valid session) requires a magic-link login
 * helper that doesn't exist yet; add those tests in a follow-up rather
 * than leaving a dead skeleton that looks like coverage.
 */

test.describe('Portal — unauthenticated access is refused', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/portal/dashboard');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('deliverables page redirects to login', async ({ page }) => {
    await page.goto('/portal/deliverables/analysis');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('settings page redirects to login', async ({ page }) => {
    await page.goto('/portal/settings');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('API /mood-board-feedback returns 401 without auth', async ({ request }) => {
    const res = await request.get('/portal/api/mood-board-feedback?deliverable_id=00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(401);
  });

  test('API /mood-board-feedback POST returns 401 without auth', async ({ request }) => {
    const res = await request.post('/portal/api/mood-board-feedback', {
      data: { deliverable_id: '00000000-0000-0000-0000-000000000000', variant_name: 'v1' },
    });
    expect(res.status()).toBe(401);
  });

  test('API /mood-board-feedback/:id/unlock returns 401 without auth', async ({ request }) => {
    const res = await request.put(
      '/portal/api/mood-board-feedback/00000000-0000-0000-0000-000000000000/unlock?deliverable_id=00000000-0000-0000-0000-000000000000',
    );
    expect(res.status()).toBe(401);
  });

  test('API /deliverables returns 401 without auth', async ({ request }) => {
    const res = await request.get('/portal/api/deliverables/analysis/foo.md');
    expect(res.status()).toBe(401);
  });
});

