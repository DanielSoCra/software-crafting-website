# Mood Board Feedback System

**Status:** Deployed to production  
**Last Updated:** 2026-04-07

## Overview

The Mood Board Feedback system allows clients to provide structured feedback on design variant candidates. Clients can vote on variants, add detailed comments, and lock feedback for final submission. Admins can view all feedback and unlock responses for re-editing.

## Features

### Client Experience

#### Voting (Mandatory)
- **❤️ Gefällt mir (Like)** — Client prefers this variant
- **👎 Gefällt mir nicht (Dislike)** — Client dislikes this variant
- **⭐ Favorit (Favorite)** — Client's preferred variant (max 1 per mood board)

Only one of Like/Dislike/Favorite can be selected per variant. Favorite is independent.

#### Comments (Optional)
Three feedback fields per variant, 500 chars max each:
- **Was gefällt dir nicht?** — What's missing, wrong, or needs improvement
- **Was ist gut?** — What works well
- **Was ist sehr gut?** — Standout strengths or innovations

#### Auto-Save
Comments and votes auto-save on input blur (for comments) and immediate click (for buttons). No manual save required. Unsaved drafts persist if user navigates away or switches variants.

#### Submit Lock
Client clicks "Jetzt absenden" to finalize feedback. This:
- Locks all variants for the deliverable (status: "submitted")
- Creates rows for any variants with no prior feedback
- Shows "✓ Danke für dein Feedback!" confirmation
- Prevents further edits until admin unlocks

### Admin Experience

#### View Submitted Feedback
Admins see a read-only display of all client feedback:
- Client's vote per variant (or "Keine Bewertung" if unvoted)
- All comments for each variant
- Status badge: "Feedback abgesendet" or "Kunde bearbeitet noch"

#### Unlock for Re-Editing
Admins can click "Zum Bearbeiten freigeben" to reset submitted feedback back to editing status. This:
- Clears `submitted_at` timestamp (audit trail cleanliness)
- Sets status to "editing"
- Re-enables all form fields for the client
- Triggers real-time notification (client sees fields enable)
- Client can re-submit when ready

#### Real-Time Updates
Clients receive real-time Supabase notification when admin unlocks their feedback. Page automatically refreshes to show editable form state.

## Database Schema

**Table:** `mood_board_feedback`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `deliverable_id` | UUID | FK to `deliverables` |
| `client_id` | UUID | FK to `clients` (tenant isolation) |
| `variant_name` | TEXT | e.g., "Variante 1" |
| `vote` | TEXT | 'like' \| 'dislike' \| 'favorite' \| null |
| `is_favorite` | BOOLEAN | Separate from vote (can have vote + favorite) |
| `comment_negative` | TEXT | "Was gefällt dir nicht?" (500 char max) |
| `comment_positive` | TEXT | "Was ist gut?" (500 char max) |
| `comment_very_good` | TEXT | "Was ist sehr gut?" (500 char max) |
| `status` | TEXT | 'editing' \| 'submitted' |
| `submitted_at` | TIMESTAMPTZ | When client locked feedback (null if editing) |
| `created_at` | TIMESTAMPTZ | First feedback row creation |
| `updated_at` | TIMESTAMPTZ | Last change timestamp |

**Unique Constraints:**
- `(deliverable_id, client_id, variant_name)` — One feedback row per variant per client per deliverable
- `(deliverable_id, client_id) WHERE is_favorite = true` — Max one favorite per deliverable+client

## API Endpoints

**Edge Function:** `/functions/v1/mood-board-feedback`

### GET /mood-board-feedback?deliverable_id={id}

Fetch all feedback for a deliverable+client.

**Response:**
```json
[
  {
    "id": "uuid",
    "deliverable_id": "uuid",
    "client_id": "uuid",
    "variant_name": "Variante 1",
    "vote": "like",
    "is_favorite": false,
    "comment_negative": "...",
    "comment_positive": "...",
    "comment_very_good": "...",
    "status": "submitted",
    "submitted_at": "2026-04-07T12:00:00Z",
    "created_at": "2026-04-07T10:00:00Z",
    "updated_at": "2026-04-07T12:00:00Z"
  }
]
```

### POST /mood-board-feedback

Save or update feedback (partial upsert).

**Body:**
```json
{
  "deliverable_id": "uuid",
  "variant_name": "Variante 1",
  "vote": "like",
  "is_favorite": false,
  "comment_negative": "...",
  "comment_positive": "...",
  "comment_very_good": "..."
}
```

Only provided fields are updated (preserves existing data). Fields omitted are not touched.

**Validation:**
- `deliverable_id` and `variant_name` required
- Comment fields limited to 500 characters
- Returns 400 if validation fails

**Response:** Updated row.

### PUT /mood-board-feedback/{id}/submit

Lock all feedback for a deliverable as submitted.

**Preconditions:**
- User must own the feedback (ownership verified at endpoint)
- Status must be "editing"

**Behavior:**
- Sets `status: "submitted"` and `submitted_at: now()`
- Client receives success confirmation
- All form fields disabled for the variant set

**Response:** Updated row.

### PUT /mood-board-feedback/{id}/unlock

Reset submitted feedback back to editing (admin only).

**Preconditions:**
- User must have `role = 'admin'`

**Behavior:**
- Sets `status: "editing"` and `submitted_at: null`
- Clears submission timestamp for audit clarity
- Real-time notification triggers client page refresh

**Response:** Updated row.

## Row-Level Security (RLS)

| Policy | Allows |
|--------|--------|
| Clients can view own feedback | Clients see feedback for their client_id only |
| Clients can insert feedback | Clients create rows for their own client_id |
| Clients can update if editing | Clients edit only rows with `status = 'editing'` |
| Admins can view all | Admins see all feedback regardless of client |
| Admins can unlock | Admins update `status` to reset feedback |

Edge Function uses `SERVICE_ROLE` key, so RLS doesn't apply to backend operations. RLS is a secondary check for direct client queries.

## Security Considerations

### Authentication
- All endpoints require valid Supabase auth token (Bearer token in Authorization header)
- Token extracted via `supabase.auth.getUser(token)`

### Authorization
- Clients isolated by `client_id` (RLS policy check)
- Submit endpoint verifies ownership (returns 403 if feedback belongs to different client)
- Admin operations check `user_roles` table for `role = 'admin'`

### Input Validation
- Comment field lengths validated server-side (max 500 chars)
- `deliverable_id` and `variant_name` required
- No SQL injection risk (Supabase SDK handles parameterization)

### CORS
- Restricted to portal domain (`https://software-crafting.de`) 
- Prevents cross-origin requests with credentials

## Component Files

### `src/components/MoodBoardFeedback.astro`
Main feedback component. Props:
- `deliverableId: string` — Unique deliverable identifier
- `variants: string[]` — List of variant names (e.g., ["Variante 1", "Variante 2"])
- `isAdmin: boolean` — Whether authenticated user is admin
- `currentVariant: string` — Active variant name
- `feedbackData: MoodBoardFeedback[]` — Persisted feedback rows

Renders two views:
- **Client View:** Voting buttons, comment fields, submit button
- **Admin View:** Status badge, unlock button, read-only feedback display

### `src/pages/portal/deliverables/[...path].astro`
Deliverable viewer. For mood-board type:
1. Loads all variant HTML files
2. Embeds assets as data-URIs (avoids iframe auth issues)
3. Fetches feedback from Supabase (SSR)
4. Passes to MoodBoardFeedback component
5. Dispatches custom event on variant change

### `supabase/functions/mood-board-feedback/index.ts`
Edge Function implementing all CRUD and state transition operations.

## Variant Switching

Clicking a variant button:
1. Updates iframe content (srcdoc)
2. Dispatches `mood-board-variant-changed` custom event
3. Component updates vote buttons, comment fields, and disabled state for new variant
4. Updates URL query param (?variant=...) for bookmarkable state
5. **Does not reload page** — preserves unsaved comment drafts

## Testing Checklist

### Client Feedback
- [ ] Vote buttons toggle correctly (only one of Like/Dislike active at a time)
- [ ] Favorite button independent (can have vote + favorite)
- [ ] Comments auto-save on blur (no manual save button)
- [ ] Comment field max 500 chars enforced
- [ ] Switching variants preserves unsaved comment text
- [ ] Submit button locks all variants
- [ ] Success message appears after submit
- [ ] Form fields disabled after submit
- [ ] Variant URL param (?variant=X) persists on page reload

### Admin Unlock
- [ ] Admin sees submitted feedback in read-only mode
- [ ] Unlock button visible when feedback submitted
- [ ] Clicking unlock resets form to editing state
- [ ] Client receives real-time notification (Realtime subscription fires)
- [ ] Client page fields re-enable when unlocked
- [ ] `submitted_at` cleared on unlock (no double timestamp)

### API Validation
- [ ] POST with comment > 500 chars returns 400
- [ ] POST without deliverable_id/variant_name returns 400
- [ ] Partial updates preserve existing fields (e.g., save vote, then save comment → both persist)
- [ ] Unauthorized users (no auth token) get 401
- [ ] Clients can't submit other clients' feedback (ownership check returns 403)
- [ ] Admins can unlock any feedback

### Security
- [ ] CORS header restricts to portal domain
- [ ] SSL certificate valid and not expiring soon
- [ ] HTTP redirects to HTTPS
- [ ] No sensitive data in query params or response headers

### Performance
- [ ] Page loads within 2 seconds
- [ ] Comment auto-save doesn't block UI
- [ ] Real-time Realtime subscription doesn't leak across tabs

## Deployment Notes

**Migration:** `20260406_create_mood_board_feedback.sql`
- Creates table with RLS policies
- Enables Realtime publication for unlock notifications

**Environment Variables:**
- `PORTAL_URL` — CORS origin (defaults to `https://software-crafting.de` if not set)

**Build:** Astro 6 SSR build includes component and integration.

**Edge Function:** Auto-deployed on push to `main` via GitHub Actions.

## Future Enhancements

- Variant ranking (weighted score based on votes)
- Export feedback as PDF per client
- Bulk feedback notifications (batch multiple clients)
- Comment templates or quick-select buttons
- Variant comparison view (side-by-side with all feedback)

## Support

For questions or bugs, contact the development team or file an issue in the GitHub repo.
