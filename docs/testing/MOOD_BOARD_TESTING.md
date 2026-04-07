# Mood Board Feedback — Testing Guide

## Overview

This guide covers automated and manual testing for the Mood Board Feedback feature.

### Test Files
- **E2E Tests:** `tests/e2e/mood-board-feedback.spec.ts`
- **API Tests:** `tests/api/mood-board-feedback-api.spec.ts`
- **Unit Tests:** `tests/unit/mood-board-feedback.spec.ts`

### Status
- **Unit Tests:** Ready to run (no dependencies)
- **E2E Tests:** Skipped (require Supabase test fixtures)
- **API Tests:** Skipped (require Supabase test fixtures)

---

## Running Tests

### Unit Tests (Ready Now)
```bash
# Run all unit tests
pnpm test:unit

# Run with UI
pnpm test:unit:ui

# Run specific test file
pnpm test:unit tests/unit/mood-board-feedback.spec.ts

# Run with coverage
pnpm test:unit --coverage
```

**Status:** ✅ Can run immediately  
**Coverage:** Vote state, comments, partial updates, data validation, form transitions

---

### E2E Tests (Requires Setup)
```bash
# Run all E2E tests
pnpm test

# Run specific test file
pnpm test tests/e2e/mood-board-feedback.spec.ts

# Run with UI
pnpm test:ui

# Run in headed mode (see browser)
pnpm test --headed
```

**Status:** ⏸ Currently skipped (test fixtures needed)  
**To Enable:** Set up Supabase test environment and auth fixtures

---

### API Tests (Requires Setup)
```bash
# Create a separate test directory structure if not using Playwright for API tests
# API tests follow same pattern as E2E but use request API instead of page navigation
```

**Status:** ⏸ Currently skipped (test fixtures needed)  
**To Enable:** Set up Supabase test environment with test data

---

## Test Fixture Setup (For E2E & API Tests)

### 1. Create Test Environment
```bash
# Set up separate Supabase project for testing
# Or use development environment with test data isolation
```

### 2. Create Test User
```sql
-- In Supabase
INSERT INTO auth.users (...) VALUES (test_user_uuid);
```

### 3. Create Test Client
```sql
INSERT INTO clients (id, user_id, company, slug)
VALUES ('test-client-uuid', 'test_user_uuid', 'Test Client', 'test-client');
```

### 4. Create Test Deliverable
```sql
INSERT INTO deliverables (id, client_id, type, status)
VALUES ('test-deliverable-uuid', 'test-client-uuid', 'mood-board', 'published');
```

### 5. Create Test Variant Files
```bash
# Create test HTML files
mkdir -p /var/www/portal-assets/test-client/mood-board/
cat > variant-1.html << 'EOF'
<html>
  <body>
    <h1>Variante 1</h1>
    <img src="assets/test.png" alt="test" />
  </body>
</html>
EOF
```

### 6. Update playwright.config.ts
```typescript
// Add fixture to extract auth token
test.beforeAll(async ({ browser }) => {
  // Login via UI or use Supabase direct client
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login and save session
  // await page.goto('/portal/login');
  // await loginAsTestUser(page);
  
  // Extract token for API tests
  // const token = await page.evaluate(() => 
  //   document.querySelector('meta[name="auth-token"]')?.getAttribute('content')
  // );
});
```

---

## Manual Testing Checklist

### Client Feedback Flow
- [ ] Navigate to mood board deliverable
- [ ] Vote on Variante 1:
  - [ ] Click ❤️ Like → button highlights blue
  - [ ] Click ❤️ again → deselects (toggle)
  - [ ] Click 👎 Dislike → Like clears, Dislike highlights
  - [ ] Click ⭐ Favorite → active independently
- [ ] Add comments:
  - [ ] Type in "Was gefällt dir nicht?" field
  - [ ] Field auto-saves on blur (check Network tab)
  - [ ] Can't exceed 500 chars (HTML maxlength prevents)
- [ ] Switch to Variante 2:
  - [ ] Iframe updates
  - [ ] Feedback form updates
  - [ ] Comment from Variante 1 preserved (not lost)
- [ ] Submit feedback:
  - [ ] Click "Jetzt absenden" button
  - [ ] Button changes to "✓ Danke für dein Feedback!"
  - [ ] All form fields disable
  - [ ] Success box visible
- [ ] Reload page:
  - [ ] Feedback still shows as submitted
  - [ ] Form remains disabled

### Admin Unlock Flow
- [ ] Login as admin
- [ ] Navigate to same deliverable
- [ ] See submitted feedback:
  - [ ] Vote shows as icon (e.g., "❤️ Gefällt mir")
  - [ ] Comments show in read-only format
  - [ ] Status badge shows "Feedback abgesendet"
- [ ] Click "Zum Bearbeiten freigeben":
  - [ ] Button shows "Freigegeben!" and disables
  - [ ] (Realtime) Client's page should auto-refresh
  - [ ] Client sees form re-enabled
- [ ] Client re-edits and submits:
  - [ ] `submitted_at` timestamp updates to new submission time

### API Validation
```bash
# Test server-side comment validation (500 char max)
curl -X POST http://localhost:4321/functions/v1/mood-board-feedback \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "deliverable_id": "...",
    "variant_name": "Variante 1",
    "comment_negative": "'$(printf 'a%.0s' {1..501})'"
  }'
# Should return: { "error": "comment_negative exceeds 500 characters" }
```

### CORS Validation
```bash
# Test CORS header restriction
curl -X GET http://localhost:4321/functions/v1/mood-board-feedback \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Origin: https://evil.com" \
  -i | grep -i "access-control-allow-origin"
# Should NOT return "*" or evil.com
```

---

## Test Coverage Goals

| Component | Unit Tests | E2E Tests | Manual Tests |
|-----------|-----------|-----------|-------------|
| Vote state management | ✅ 5 tests | ⏸ | ✅ |
| Comment handling | ✅ 4 tests | ⏸ | ✅ |
| Form state transitions | ✅ 3 tests | ⏸ | ✅ |
| Variant switching | ✅ 3 tests | ⏸ | ✅ |
| Partial updates | ✅ 3 tests | ⏸ | N/A |
| API endpoints | ⏸ | ⏸ | ✅ |
| RLS policies | ⏸ | ⏸ | ✅ |
| Realtime updates | ✅ 1 test | ⏸ | ✅ |

**Current Coverage:** 19 unit tests (all logic paths)  
**Target:** +20 E2E tests (when fixtures available)

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml (suggested)
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '22.12.0'
          cache: 'pnpm'
      
      - run: pnpm install
      
      # Unit tests (no dependencies)
      - run: pnpm test:unit
      
      # E2E tests (requires Supabase)
      # - run: pnpm test --project=chromium
      #   env:
      #     SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
      #     SUPABASE_TEST_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
```

---

## Debugging Tests

### Unit Tests
```bash
# Run with verbose output
pnpm test:unit --reporter=verbose

# Run single test
pnpm test:unit -t "vote button toggles"

# Debug with inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs
```

### E2E Tests
```bash
# Run in headed mode (see browser)
pnpm test --headed

# Pause and debug
# Add: await page.pause() in test

# Generate trace for debugging
pnpm test --trace on

# View generated trace
npx playwright show-trace trace.zip
```

### Console Output
```typescript
// In test, log all API requests/responses
page.on('response', response => {
  console.log(`${response.request().method()} ${response.url()} → ${response.status()}`);
});
```

---

## Performance Testing

### Load Testing
```bash
# Simulate multiple clients submitting feedback concurrently
# Use Apache Bench or similar to hit /functions/v1/mood-board-feedback
ab -n 100 -c 10 -p payload.json http://localhost:4321/functions/v1/mood-board-feedback
```

### Response Time Thresholds
- POST feedback: < 200ms
- GET feedback: < 100ms
- PUT submit: < 200ms
- PUT unlock: < 200ms

---

## Known Test Limitations

1. **No Supabase Test Fixtures Yet**
   - E2E and API tests are skipped until fixtures are set up
   - Unit tests run independently

2. **Realtime Subscription Hard to Test**
   - Real Supabase connection required
   - Consider manual testing for Realtime features

3. **CORS Testing Limited**
   - Requires browser or curl for proper Origin header testing
   - Not easily automated in Playwright

---

## Future Improvements

- [ ] Set up Supabase test environment
- [ ] Create Playwright auth fixtures
- [ ] Add E2E tests with fixtures
- [ ] Add API contract tests
- [ ] Visual regression testing (screenshot comparison)
- [ ] Performance benchmarking CI job
- [ ] Coverage reporting (target: 80%+)

---

## Running All Tests
```bash
# Run all (currently: units only)
pnpm test:unit && pnpm test

# After fixtures are set up:
pnpm test:unit && pnpm test  # Will run E2E + API tests
```

---

## Troubleshooting

### Tests Time Out
```bash
# Increase timeout
pnpm test --timeout=10000
```

### Browser Won't Start
```bash
# Install browser binaries
npx playwright install
```

### Cannot Find Test Fixtures
- Ensure Supabase test environment is running
- Check `SUPABASE_TEST_URL` and `SUPABASE_TEST_KEY` env vars

### Database in Wrong State
```sql
-- Reset test data
DELETE FROM mood_board_feedback WHERE client_id = 'test-client-uuid';
DELETE FROM deliverables WHERE client_id = 'test-client-uuid';
DELETE FROM clients WHERE id = 'test-client-uuid';
```

---

## References

- [Playwright Testing](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Mood Board Feedback API](./docs/features/mood-board-feedback.md)
