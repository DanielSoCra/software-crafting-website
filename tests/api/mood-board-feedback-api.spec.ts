import { test, expect } from '@playwright/test';

/**
 * API Tests for Mood Board Feedback Edge Function
 *
 * These tests verify the backend API at /functions/v1/mood-board-feedback
 * They use direct HTTP requests rather than UI automation.
 *
 * Note: Requires valid Supabase auth token and test data setup
 */

const API_URL = 'http://localhost:4321/functions/v1/mood-board-feedback';

test.describe('Mood Board Feedback API', () => {
  // Test setup: Valid auth token from authenticated session
  let authToken: string;
  let testDeliverableId: string;
  let testClientId: string;

  test.beforeAll(async () => {
    // Would be set up from test fixture with authenticated Supabase session
    // authToken = await getAuthToken()
    // testDeliverableId = await createTestDeliverable()
    // testClientId = await getTestClientId()
  });

  test.describe('GET /mood-board-feedback', () => {
    test.skip('fetch feedback for deliverable returns all client feedback', async ({ request }) => {
      // const response = await request.get(`${API_URL}?deliverable_id=${testDeliverableId}`, {
      //   headers: { Authorization: `Bearer ${authToken}` },
      // })
      // expect(response.status()).toBe(200)
      // const data = await response.json()
      // expect(Array.isArray(data)).toBe(true)
      // data.forEach(row => {
      //   expect(row.deliverable_id).toBe(testDeliverableId)
      //   expect(row.client_id).toBe(testClientId)
      // })
    });

    test.skip('missing deliverable_id returns 400', async ({ request }) => {
      // const response = await request.get(`${API_URL}`, {
      //   headers: { Authorization: `Bearer ${authToken}` },
      // })
      // expect(response.status()).toBe(400)
      // const data = await response.json()
      // expect(data.error).toContain('deliverable_id required')
    });

    test.skip('unauthorized request returns 401', async ({ request }) => {
      // const response = await request.get(`${API_URL}?deliverable_id=test`, {
      //   headers: { Authorization: 'Bearer invalid-token' },
      // })
      // expect(response.status()).toBe(401)
    });

    test.skip('client can only see own feedback (RLS)', async ({ request }) => {
      // const otherClientId = 'different-uuid'
      // const response = await request.get(
      //   `${API_URL}?deliverable_id=${testDeliverableId}`,
      //   { headers: { Authorization: `Bearer ${authToken}` } }
      // )
      // const data = await response.json()
      // data.forEach(row => {
      //   expect(row.client_id).toBe(testClientId) // Not otherClientId
      // })
    });
  });

  test.describe('POST /mood-board-feedback', () => {
    test.skip('create new feedback with vote', async ({ request }) => {
      // const response = await request.post(API_URL, {
      //   headers: {
      //     Authorization: `Bearer ${authToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     variant_name: 'Variante 1',
      //     vote: 'like',
      //   },
      // })
      // expect(response.status()).toBe(200)
      // const data = await response.json()
      // expect(data.vote).toBe('like')
      // expect(data.status).toBe('editing')
    });

    test.skip('partial update preserves existing fields', async ({ request }) => {
      // First: Create feedback with vote
      // const createRes = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     variant_name: 'Variante 2',
      //     vote: 'like',
      //   },
      // })
      // const created = await createRes.json()

      // Second: Update comment only (vote should be preserved)
      // const updateRes = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     variant_name: 'Variante 2',
      //     comment_positive: 'This looks great',
      //   },
      // })
      // const updated = await updateRes.json()
      // expect(updated.vote).toBe('like') // Preserved from first request
      // expect(updated.comment_positive).toBe('This looks great')
    });

    test.skip('comment > 500 chars rejected with 400', async ({ request }) => {
      // const longComment = 'a'.repeat(501)
      // const response = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     variant_name: 'Variante 1',
      //     comment_negative: longComment,
      //   },
      // })
      // expect(response.status()).toBe(400)
      // const data = await response.json()
      // expect(data.error).toContain('exceeds 500')
    });

    test.skip('all three comment fields validated', async ({ request }) => {
      // const longComment = 'a'.repeat(501)
      // for (const field of ['comment_negative', 'comment_positive', 'comment_very_good']) {
      //   const response = await request.post(API_URL, {
      //     headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //     data: {
      //       deliverable_id: testDeliverableId,
      //       variant_name: 'Variante 1',
      //       [field]: longComment,
      //     },
      //   })
      //   expect(response.status()).toBe(400)
      // }
    });

    test.skip('missing deliverable_id returns 400', async ({ request }) => {
      // const response = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     variant_name: 'Variante 1',
      //     vote: 'like',
      //   },
      // })
      // expect(response.status()).toBe(400)
      // expect((await response.json()).error).toContain('deliverable_id')
    });

    test.skip('missing variant_name returns 400', async ({ request }) => {
      // const response = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     vote: 'like',
      //   },
      // })
      // expect(response.status()).toBe(400)
      // expect((await response.json()).error).toContain('variant_name')
    });

    test.skip('only favorite can have is_favorite=true', async ({ request }) => {
      // Two variants with is_favorite=true should trigger UNIQUE constraint
      // (But Edge Function should handle gracefully or prevent duplicates)
    });
  });

  test.describe('PUT /mood-board-feedback/:id/submit', () => {
    test.skip('submit locks feedback and sets submitted_at', async ({ request }) => {
      // Setup: Create feedback
      // const createRes = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: { deliverable_id: testDeliverableId, variant_name: 'Variante 1', vote: 'like' },
      // })
      // const created = await createRes.json()
      // const feedbackId = created.id

      // Submit
      // const submitRes = await request.put(`${API_URL}/${feedbackId}/submit`, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      // })
      // expect(submitRes.status()).toBe(200)
      // const submitted = await submitRes.json()
      // expect(submitted.status).toBe('submitted')
      // expect(submitted.submitted_at).toBeTruthy()
    });

    test.skip('submit requires ownership (403 if not your feedback)', async ({ request }) => {
      // Try to submit someone else's feedback using different auth token
      // const response = await request.put(`${API_URL}/other-user-feedback-id/submit`, {
      //   headers: { Authorization: `Bearer ${differentAuthToken}` },
      // })
      // expect(response.status()).toBe(403)
      // expect((await response.json()).error).toContain('Forbidden')
    });

    test.skip('submit non-existent feedback returns 404', async ({ request }) => {
      // const response = await request.put(`${API_URL}/nonexistent-id/submit`, {
      //   headers: { Authorization: `Bearer ${authToken}` },
      // })
      // expect(response.status()).toBe(404)
    });

    test.skip('submit is idempotent', async ({ request }) => {
      // Submit same feedback twice should work both times
      // const submitRes1 = await request.put(`${API_URL}/${feedbackId}/submit`, {
      //   headers: { Authorization: `Bearer ${authToken}` },
      // })
      // const submitRes2 = await request.put(`${API_URL}/${feedbackId}/submit`, {
      //   headers: { Authorization: `Bearer ${authToken}` },
      // })
      // expect(submitRes1.status()).toBe(200)
      // expect(submitRes2.status()).toBe(200)
      // Both should have same submitted_at timestamp
    });
  });

  test.describe('PUT /mood-board-feedback/:id/unlock', () => {
    test.skip('admin can unlock submitted feedback', async ({ request }) => {
      // Setup: Submit feedback, then unlock as admin
      // const unlockRes = await request.put(`${API_URL}/${feedbackId}/unlock`, {
      //   headers: { Authorization: `Bearer ${adminAuthToken}` },
      // })
      // expect(unlockRes.status()).toBe(200)
      // const unlocked = await unlockRes.json()
      // expect(unlocked.status).toBe('editing')
      // expect(unlocked.submitted_at).toBeNull() // Cleared on unlock
    });

    test.skip('non-admin cannot unlock (403)', async ({ request }) => {
      // Client tries to unlock
      // const response = await request.put(`${API_URL}/${feedbackId}/unlock`, {
      //   headers: { Authorization: `Bearer ${clientAuthToken}` },
      // })
      // expect(response.status()).toBe(403)
      // expect((await response.json()).error).toContain('Admin only')
    });

    test.skip('unlock clears submitted_at timestamp', async ({ request }) => {
      // After unlock, submitted_at should be null
      // const unlockRes = await request.put(`${API_URL}/${feedbackId}/unlock`, {
      //   headers: { Authorization: `Bearer ${adminAuthToken}` },
      // })
      // const unlocked = await unlockRes.json()
      // expect(unlocked.submitted_at).toBeNull()
    });

    test.skip('unlock non-existent feedback returns 404', async ({ request }) => {
      // const response = await request.put(`${API_URL}/nonexistent-id/unlock`, {
      //   headers: { Authorization: `Bearer ${adminAuthToken}` },
      // })
      // expect(response.status()).toBe(404)
    });
  });

  test.describe('CORS & Security', () => {
    test.skip('CORS headers restrict to portal domain', async ({ request }) => {
      // const response = await request.get(`${API_URL}?deliverable_id=test`, {
      //   headers: {
      //     Authorization: `Bearer ${authToken}`,
      //     Origin: 'https://evil.com',
      //   },
      // })
      // const allowOrigin = response.headers()['access-control-allow-origin']
      // expect(allowOrigin).not.toBe('*')
      // expect(allowOrigin).toContain('software-crafting.de')
    });

    test.skip('OPTIONS request returns CORS headers', async ({ request }) => {
      // const response = await request.options(API_URL, {
      //   headers: { Origin: 'https://software-crafting.de' },
      // })
      // expect(response.status()).toBe(200)
      // expect(response.headers()['access-control-allow-origin']).toBeTruthy()
    });
  });

  test.describe('Edge Cases', () => {
    test.skip('vote=null clears vote', async ({ request }) => {
      // Create with vote: 'like', then update with vote: null
      // const response = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     variant_name: 'Variante 1',
      //     vote: null,
      //   },
      // })
      // const data = await response.json()
      // expect(data.vote).toBeNull()
    });

    test.skip('is_favorite=true enforces unique constraint', async ({ request }) => {
      // Mark Variante 1 as favorite, then try to mark Variante 2 as favorite
      // Second should fail with UNIQUE constraint error
    });

    test.skip('special characters in comments are escaped', async ({ request }) => {
      // Store comment with quotes, newlines, HTML tags
      // Verify they're returned as-is (not stripped or escaped for storage)
      // const response = await request.post(API_URL, {
      //   headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      //   data: {
      //     deliverable_id: testDeliverableId,
      //     variant_name: 'Variante 1',
      //     comment_positive: 'Quote "test" & <html> tags\nNewline',
      //   },
      // })
      // const data = await response.json()
      // expect(data.comment_positive).toBe('Quote "test" & <html> tags\nNewline')
    });
  });
});
