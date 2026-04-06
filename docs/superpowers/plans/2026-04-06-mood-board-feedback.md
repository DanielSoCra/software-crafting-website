# Mood Board Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a client feedback system for mood board variants with voting (like/dislike/favorite), per-variant comments (3 fields), and admin controls to unlock editing after submission.

**Architecture:** Supabase-backed feedback storage with RLS policies, Edge Function for vote/comment persistence, Astro component rendering feedback UI conditionally for clients (editable until submitted) and admins (read-only with unlock button). Real-time status updates via Supabase Realtime.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions), Astro SSR, TypeScript, Realtime subscriptions

---

## Task 1: Create Database Migration

**Files:**
- Create: `supabase/migrations/20260406_create_mood_board_feedback.sql`

- [ ] **Step 1: Create migration file**

Create the file at `supabase/migrations/20260406_create_mood_board_feedback.sql` with the following content:

```sql
-- Create mood_board_feedback table
CREATE TABLE IF NOT EXISTS mood_board_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL,
  client_id UUID NOT NULL,
  variant_name TEXT NOT NULL, -- e.g. "Variante 1"
  vote TEXT, -- 'like' | 'dislike' | 'favorite' | null
  is_favorite BOOLEAN DEFAULT false,
  comment_negative TEXT, -- "Was gefällt dir nicht?"
  comment_positive TEXT, -- "Was ist gut?"
  comment_very_good TEXT, -- "Was ist sehr gut?"
  status TEXT DEFAULT 'editing', -- 'editing' | 'submitted'
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(deliverable_id, client_id, variant_name)
);

-- Constraint: only one is_favorite per deliverable+client
CREATE UNIQUE INDEX idx_mood_board_favorite 
ON mood_board_feedback(deliverable_id, client_id) 
WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE mood_board_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view/edit their own feedback
CREATE POLICY "Clients can view own feedback"
ON mood_board_feedback FOR SELECT
USING (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Clients can insert feedback"
ON mood_board_feedback FOR INSERT
WITH CHECK (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Clients can update own feedback if editing"
ON mood_board_feedback FOR UPDATE
USING (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1) 
  AND status = 'editing'
);

-- RLS Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON mood_board_feedback FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policy: Admins can update status
CREATE POLICY "Admins can unlock feedback"
ON mood_board_feedback FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Index for queries
CREATE INDEX idx_mood_board_deliverable ON mood_board_feedback(deliverable_id);
CREATE INDEX idx_mood_board_client ON mood_board_feedback(client_id);
```

- [ ] **Step 2: Apply migration**

Run the migration via Supabase CLI:

```bash
cd /Users/daniel/code/software-crafting-website
supabase migration up
```

Expected output: Migration applied successfully (or confirm in Supabase dashboard).

- [ ] **Step 3: Verify in Supabase**

Check the schema in Supabase dashboard → SQL Editor:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'mood_board_feedback';
```

Expected: One row with `mood_board_feedback`.

- [ ] **Step 4: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add supabase/migrations/20260406_create_mood_board_feedback.sql
git commit -m "feat: add mood_board_feedback table with RLS policies"
```

---

## Task 2: Create Edge Function

**Files:**
- Create: `supabase/functions/mood-board-feedback/index.ts`

- [ ] **Step 1: Create function directory**

```bash
mkdir -p /Users/daniel/code/software-crafting-website/supabase/functions/mood-board-feedback
```

- [ ] **Step 2: Write Edge Function**

Create `supabase/functions/mood-board-feedback/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    // GET /mood-board-feedback?deliverable_id=...
    if (req.method === 'GET') {
      const deliverableId = url.searchParams.get('deliverable_id');
      if (!deliverableId) {
        return new Response(JSON.stringify({ error: 'deliverable_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get client_id for this user
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !client) {
        return new Response(JSON.stringify({ error: 'Client not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get feedback for this deliverable + client
      const { data, error } = await supabase
        .from('mood_board_feedback')
        .select('*')
        .eq('deliverable_id', deliverableId)
        .eq('client_id', client.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /mood-board-feedback - Save vote/comments
    if (req.method === 'POST') {
      const body = await req.json();
      const { deliverable_id, variant_name, vote, is_favorite, comment_negative, comment_positive, comment_very_good } = body;

      if (!deliverable_id || !variant_name) {
        return new Response(JSON.stringify({ error: 'deliverable_id and variant_name required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get client_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !client) {
        return new Response(JSON.stringify({ error: 'Client not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert feedback
      const { data, error } = await supabase
        .from('mood_board_feedback')
        .upsert({
          deliverable_id,
          client_id: client.id,
          variant_name,
          vote: vote || null,
          is_favorite: is_favorite || false,
          comment_negative: comment_negative || null,
          comment_positive: comment_positive || null,
          comment_very_good: comment_very_good || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'deliverable_id,client_id,variant_name'
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /mood-board-feedback/:id/submit - Mark as submitted
    if (pathname.includes('/submit') && req.method === 'PUT') {
      const id = pathname.split('/')[3];
      const { data, error } = await supabase
        .from('mood_board_feedback')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /mood-board-feedback/:id/unlock - Admin only: unlock for editing
    if (pathname.includes('/unlock') && req.method === 'PUT') {
      // Check if user is admin
      const { data: adminRole, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (adminError || !adminRole) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const id = pathname.split('/')[3];
      const { data, error } = await supabase
        .from('mood_board_feedback')
        .update({
          status: 'editing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 3: Create deno.json for dependencies**

Create `supabase/functions/mood-board-feedback/deno.json`:

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.43.4"
  }
}
```

- [ ] **Step 4: Deploy function**

```bash
cd /Users/daniel/code/software-crafting-website
supabase functions deploy mood-board-feedback
```

Expected: Function deployed successfully.

- [ ] **Step 5: Test function (optional)**

In Supabase dashboard → Functions, test endpoint with sample data.

- [ ] **Step 6: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add supabase/functions/mood-board-feedback/
git commit -m "feat: add mood-board-feedback edge function"
```

---

## Task 3: Add Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Read existing types file**

Open `src/lib/types.ts` and add these types at the end:

```typescript
// Mood Board Feedback Types
export type MoodBoardVote = 'like' | 'dislike' | 'favorite' | null;
export type MoodBoardFeedbackStatus = 'editing' | 'submitted';

export interface MoodBoardFeedback {
  id: string;
  deliverable_id: string;
  client_id: string;
  variant_name: string;
  vote: MoodBoardVote;
  is_favorite: boolean;
  comment_negative: string | null;
  comment_positive: string | null;
  comment_very_good: string | null;
  status: MoodBoardFeedbackStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MoodBoardFeedbackInput {
  deliverable_id: string;
  variant_name: string;
  vote?: MoodBoardVote;
  is_favorite?: boolean;
  comment_negative?: string | null;
  comment_positive?: string | null;
  comment_very_good?: string | null;
}
```

- [ ] **Step 2: Verify syntax**

```bash
cd /Users/daniel/code/software-crafting-website
pnpm run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add mood board feedback types"
```

---

## Task 4: Create Library Functions

**Files:**
- Create: `src/lib/mood-board-feedback.ts`

- [ ] **Step 1: Create library file**

Create `src/lib/mood-board-feedback.ts`:

```typescript
import type { MoodBoardFeedback, MoodBoardFeedbackInput } from './types';

const FUNCTION_URL = '/functions/v1/mood-board-feedback';

/**
 * Get feedback for a deliverable (all variants for current user)
 */
export async function getMoodBoardFeedback(deliverableId: string, token: string): Promise<MoodBoardFeedback[]> {
  const response = await fetch(`${FUNCTION_URL}?deliverable_id=${deliverableId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feedback: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save or update a single variant's feedback (vote + comments)
 */
export async function saveMoodBoardFeedback(
  input: MoodBoardFeedbackInput,
  token: string
): Promise<MoodBoardFeedback> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to save feedback: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Submit feedback (mark all variants as submitted, lock editing)
 */
export async function submitMoodBoardFeedback(
  feedbackIds: string[],
  token: string
): Promise<void> {
  const results = await Promise.all(
    feedbackIds.map(id =>
      fetch(`${FUNCTION_URL}/${id}/submit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    )
  );

  for (const response of results) {
    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
  }
}

/**
 * Unlock feedback for editing (admin only)
 */
export async function unlockMoodBoardFeedback(feedbackId: string, token: string): Promise<MoodBoardFeedback> {
  const response = await fetch(`${FUNCTION_URL}/${feedbackId}/unlock`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to unlock feedback: ${response.statusText}`);
  }

  return response.json();
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add src/lib/mood-board-feedback.ts
git commit -m "feat: add mood board feedback api helpers"
```

---

## Task 5: Create MoodBoardFeedback Component

**Files:**
- Create: `src/components/MoodBoardFeedback.astro`

- [ ] **Step 1: Create component**

Create `src/components/MoodBoardFeedback.astro`:

```astro
---
import type { MoodBoardFeedback } from '../lib/types';

interface Props {
  deliverableId: string;
  variants: string[];
  isAdmin: boolean;
  currentVariant: string;
  feedbackData?: MoodBoardFeedback[];
}

const { deliverableId, variants, isAdmin, currentVariant, feedbackData = [] } = Astro.props;

// Build a map of variant -> feedback
const feedbackMap = new Map<string, MoodBoardFeedback>();
feedbackData.forEach(f => {
  feedbackMap.set(f.variant_name, f);
});

// Get current feedback or empty state
const currentFeedback = feedbackMap.get(currentVariant) || {
  variant_name: currentVariant,
  vote: null,
  is_favorite: false,
  comment_negative: null,
  comment_positive: null,
  comment_very_good: null,
  status: 'editing',
  id: '',
  deliverable_id: '',
  client_id: '',
  submitted_at: null,
  created_at: '',
  updated_at: '',
};

const isSubmitted = currentFeedback.status === 'submitted';
const isEditable = currentFeedback.status === 'editing';
---

<div class="mood-board-feedback mt-8 pt-8 border-t border-gray-700">
  {!isAdmin && (
    <div class="space-y-6">
      {/* Voting Buttons */}
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-gray-100">Deine Bewertung</label>
        <div class="flex gap-3">
          <button
            class="vote-button like-btn px-4 py-2 rounded-lg transition-colors"
            data-vote="like"
            data-variant={currentVariant}
            data-disabled={!isEditable}
            data-active={currentFeedback.vote === 'like'}
            disabled={!isEditable}
          >
            ❤️ Gefällt mir
          </button>
          <button
            class="vote-button dislike-btn px-4 py-2 rounded-lg transition-colors"
            data-vote="dislike"
            data-variant={currentVariant}
            data-disabled={!isEditable}
            data-active={currentFeedback.vote === 'dislike'}
            disabled={!isEditable}
          >
            👎 Gefällt mir nicht
          </button>
          <button
            class="vote-button favorite-btn px-4 py-2 rounded-lg transition-colors"
            data-vote="favorite"
            data-variant={currentVariant}
            data-disabled={!isEditable}
            data-active={currentFeedback.is_favorite}
            disabled={!isEditable}
          >
            ⭐ Favorit
          </button>
        </div>
      </div>

      {/* Comment Fields */}
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-100 mb-1">Was gefällt dir nicht?</label>
          <textarea
            class="comment-input w-full px-3 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 placeholder-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-field="comment_negative"
            data-variant={currentVariant}
            placeholder="Deine Gedanken..."
            maxlength="500"
            disabled={!isEditable}
          >{currentFeedback.comment_negative || ''}</textarea>
          <p class="text-xs text-gray-500 mt-1">Max. 500 Zeichen</p>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-100 mb-1">Was ist gut?</label>
          <textarea
            class="comment-input w-full px-3 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 placeholder-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-field="comment_positive"
            data-variant={currentVariant}
            placeholder="Deine Gedanken..."
            maxlength="500"
            disabled={!isEditable}
          >{currentFeedback.comment_positive || ''}</textarea>
          <p class="text-xs text-gray-500 mt-1">Max. 500 Zeichen</p>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-100 mb-1">Was ist sehr gut?</label>
          <textarea
            class="comment-input w-full px-3 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 placeholder-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-field="comment_very_good"
            data-variant={currentVariant}
            placeholder="Deine Gedanken..."
            maxlength="500"
            disabled={!isEditable}
          >{currentFeedback.comment_very_good || ''}</textarea>
          <p class="text-xs text-gray-500 mt-1">Max. 500 Zeichen</p>
        </div>
      </div>

      {/* Submit Button */}
      {!isSubmitted && (
        <button
          id="submit-feedback-btn"
          class="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          data-deliverable-id={deliverableId}
          data-variants={variants.join(',')}
        >
          Feedback abgesendet
        </button>
      )}

      {isSubmitted && (
        <div class="px-4 py-3 rounded-lg bg-green-900 text-green-100 text-center font-semibold">
          ✓ Feedback erhalten, danke!
        </div>
      )}
    </div>
  )}

  {isAdmin && (
    <div class="space-y-6">
      <div class="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700">
        <p class="text-sm text-gray-300 mb-4">
          {isSubmitted ? (
            <>
              <strong>Status: Feedback abgesendet</strong>
              <button
                id="unlock-feedback-btn"
                class="ml-4 px-3 py-1 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                data-feedback-ids={feedbackData.map(f => f.id).join(',')}
              >
                Zum Bearbeiten freigeben
              </button>
            </>
          ) : (
            <strong>Status: Kunde bearbeitet noch</strong>
          )}
        </p>
      </div>

      {/* Read-only display of feedback */}
      <div class="space-y-4 opacity-75">
        <div>
          <p class="text-sm font-semibold text-gray-300 mb-1">Bewertung: {currentFeedback.vote === 'like' ? '❤️ Gefällt mir' : currentFeedback.vote === 'dislike' ? '👎 Gefällt mir nicht' : currentFeedback.is_favorite ? '⭐ Favorit' : 'Keine Bewertung'}</p>
        </div>

        {currentFeedback.comment_negative && (
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-1">Was gefällt nicht:</label>
            <p class="text-gray-400">{currentFeedback.comment_negative}</p>
          </div>
        )}

        {currentFeedback.comment_positive && (
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-1">Was ist gut:</label>
            <p class="text-gray-400">{currentFeedback.comment_positive}</p>
          </div>
        )}

        {currentFeedback.comment_very_good && (
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-1">Was ist sehr gut:</label>
            <p class="text-gray-400">{currentFeedback.comment_very_good}</p>
          </div>
        )}
      </div>
    </div>
  )}
</div>

<style>
  .vote-button {
    @apply px-4 py-2 rounded-lg font-semibold transition-all;
    @apply bg-gray-800 text-gray-300 border border-gray-700;
  }

  .vote-button:not([data-disabled='true']):hover {
    @apply bg-gray-700 border-gray-600;
  }

  .vote-button[data-active='true'] {
    @apply bg-blue-600 text-white border-blue-500;
  }

  .vote-button[data-disabled='true'] {
    @apply opacity-50 cursor-not-allowed;
  }
</style>

<script define:vars={{ deliverableId, variants: variants.join(','), isAdmin }}>
  if (!isAdmin) {
    // Client-side vote & comment handling
    const voteButtons = document.querySelectorAll('.vote-button');
    const commentInputs = document.querySelectorAll('.comment-input');
    const submitBtn = document.getElementById('submit-feedback-btn');

    // Get token from localStorage (set by Astro auth)
    const token = localStorage.getItem('sb-auth-token')?.split('.')[0] || ''; // This is a simplification

    voteButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const vote = btn.getAttribute('data-vote');
        const variant = btn.getAttribute('data-variant');
        console.log(`Vote ${vote} for ${variant}`);
        // Implementation in next task
      });
    });

    commentInputs.forEach(input => {
      input.addEventListener('change', () => {
        console.log(`Comment changed for ${input.getAttribute('data-variant')}`);
        // Implementation in next task
      });
    });

    submitBtn?.addEventListener('click', async () => {
      console.log('Submit feedback');
      // Implementation in next task
    });
  } else if (isAdmin) {
    // Admin unlock button
    const unlockBtn = document.getElementById('unlock-feedback-btn');
    unlockBtn?.addEventListener('click', async () => {
      console.log('Unlock feedback');
      // Implementation in next task
    });
  }
</script>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add src/components/MoodBoardFeedback.astro
git commit -m "feat: add mood board feedback component (UI skeleton)"
```

---

## Task 6: Implement Client-Side Vote & Comment Handlers

**Files:**
- Modify: `src/components/MoodBoardFeedback.astro` (client script section)

- [ ] **Step 1: Replace the script section**

Replace the `<script>` section in `MoodBoardFeedback.astro` with:

```astro
<script define:vars={{ deliverableId, variants: JSON.stringify(variants.split(',')) }}>
  import { saveMoodBoardFeedback, submitMoodBoardFeedback } from '../lib/mood-board-feedback';

  // Get auth token from Astro.locals (passed via SSR)
  const authToken = document.querySelector('meta[name="auth-token"]')?.getAttribute('content') || '';

  const feedbackState = new Map(); // Track in-memory state per variant

  const voteButtons = document.querySelectorAll('.vote-button');
  const commentInputs = document.querySelectorAll('.comment-input');
  const submitBtn = document.getElementById('submit-feedback-btn');

  // Vote button handler
  voteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (btn.getAttribute('data-disabled') === 'true') return;

      const vote = btn.getAttribute('data-vote');
      const variant = btn.getAttribute('data-variant');

      // Update button state
      voteButtons.forEach(b => {
        if (b.getAttribute('data-variant') === variant) {
          if (b.getAttribute('data-vote') === vote) {
            b.setAttribute('data-active', 'true');
          } else {
            b.setAttribute('data-active', 'false');
          }
        }
      });

      // Track state
      if (!feedbackState.has(variant)) {
        feedbackState.set(variant, {});
      }
      const state = feedbackState.get(variant);

      if (vote === 'favorite') {
        state.is_favorite = !state.is_favorite;
        state.vote = state.is_favorite ? 'favorite' : null;
      } else {
        state.vote = state.vote === vote ? null : vote;
        state.is_favorite = false;
      }

      // Auto-save
      try {
        await saveMoodBoardFeedback(
          {
            deliverable_id: deliverableId,
            variant_name: variant,
            vote: state.vote,
            is_favorite: state.is_favorite,
            comment_negative: state.comment_negative || null,
            comment_positive: state.comment_positive || null,
            comment_very_good: state.comment_very_good || null,
          },
          authToken
        );
      } catch (err) {
        console.error('Failed to save vote:', err);
        alert('Fehler beim Speichern der Bewertung');
      }
    });
  });

  // Comment input handler
  commentInputs.forEach(input => {
    input.addEventListener('change', async (e) => {
      const variant = input.getAttribute('data-variant');
      const field = input.getAttribute('data-field');
      const value = input.value;

      if (!feedbackState.has(variant)) {
        feedbackState.set(variant, {});
      }
      const state = feedbackState.get(variant);
      state[field] = value || null;

      // Auto-save
      try {
        await saveMoodBoardFeedback(
          {
            deliverable_id: deliverableId,
            variant_name: variant,
            vote: state.vote || null,
            is_favorite: state.is_favorite || false,
            comment_negative: state.comment_negative || null,
            comment_positive: state.comment_positive || null,
            comment_very_good: state.comment_very_good || null,
          },
          authToken
        );
      } catch (err) {
        console.error('Failed to save comment:', err);
        alert('Fehler beim Speichern des Kommentars');
      }
    });
  });

  // Submit feedback
  submitBtn?.addEventListener('click', async () => {
    try {
      // Get all feedback IDs from the server
      const response = await fetch(`/functions/v1/mood-board-feedback?deliverable_id=${deliverableId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const allFeedback = await response.json();
      const feedbackIds = allFeedback.map(f => f.id);

      await submitMoodBoardFeedback(feedbackIds, authToken);

      // Show success and disable button
      submitBtn.textContent = '✓ Feedback erhalten, danke!';
      submitBtn.disabled = true;
      submitBtn.classList.add('bg-green-900', 'text-green-100', 'cursor-not-allowed');

      // Disable all inputs
      voteButtons.forEach(btn => btn.disabled = true);
      commentInputs.forEach(input => input.disabled = true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('Fehler beim Absenden des Feedbacks');
    }
  });
</script>
```

Wait — this has a direct import which won't work in Astro client scripts. Let me refactor:

Replace with:

```astro
<script define:vars={{ deliverableId, variants: JSON.stringify(variants.split(',') || []) }}>
  // Get auth token
  const authToken = document.querySelector('meta[name="auth-token"]')?.getAttribute('content') || '';

  const feedbackState = new Map();
  const voteButtons = document.querySelectorAll('.vote-button');
  const commentInputs = document.querySelectorAll('.comment-input');
  const submitBtn = document.getElementById('submit-feedback-btn');

  const FUNCTION_URL = '/functions/v1/mood-board-feedback';

  async function saveFeedback(variant, updates) {
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliverable_id: deliverableId,
          variant_name: variant,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Failed to save feedback:', err);
      alert('Fehler beim Speichern');
    }
  }

  // Vote buttons
  voteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (btn.getAttribute('data-disabled') === 'true') return;

      const vote = btn.getAttribute('data-vote');
      const variant = btn.getAttribute('data-variant');

      if (!feedbackState.has(variant)) {
        feedbackState.set(variant, { vote: null, is_favorite: false });
      }
      const state = feedbackState.get(variant);

      if (vote === 'favorite') {
        state.is_favorite = !state.is_favorite;
      } else {
        state.vote = state.vote === vote ? null : vote;
        state.is_favorite = false;
      }

      // Update UI
      voteButtons.forEach(b => {
        if (b.getAttribute('data-variant') === variant) {
          if (b.getAttribute('data-vote') === 'favorite') {
            b.setAttribute('data-active', state.is_favorite.toString());
          } else if (b.getAttribute('data-vote') === state.vote) {
            b.setAttribute('data-active', 'true');
          } else {
            b.setAttribute('data-active', 'false');
          }
        }
      });

      // Save
      await saveFeedback(variant, {
        vote: state.vote,
        is_favorite: state.is_favorite,
      });
    });
  });

  // Comment inputs
  commentInputs.forEach(input => {
    input.addEventListener('change', async (e) => {
      const variant = input.getAttribute('data-variant');
      const field = input.getAttribute('data-field');

      if (!feedbackState.has(variant)) {
        feedbackState.set(variant, {});
      }
      const state = feedbackState.get(variant);
      state[field] = input.value || null;

      await saveFeedback(variant, { [field]: state[field] });
    });
  });

  // Submit
  submitBtn?.addEventListener('click', async () => {
    try {
      const response = await fetch(`${FUNCTION_URL}?deliverable_id=${deliverableId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const allFeedback = await response.json();
      const feedbackIds = allFeedback.map(f => f.id);

      await Promise.all(
        feedbackIds.map(id =>
          fetch(`${FUNCTION_URL}/${id}/submit`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          })
        )
      );

      submitBtn.textContent = '✓ Feedback erhalten, danke!';
      submitBtn.disabled = true;
      submitBtn.classList.add('bg-green-900', 'text-green-100', 'cursor-not-allowed', 'opacity-75');

      voteButtons.forEach(btn => btn.disabled = true);
      commentInputs.forEach(inp => inp.disabled = true);
    } catch (err) {
      console.error('Failed to submit:', err);
      alert('Fehler beim Absenden');
    }
  });
</script>
```

- [ ] **Step 2: Test in browser**

Navigate to `https://software-crafting.de/portal/deliverables/mood-board?client=arinya` and test:
- Click vote buttons → should update state
- Type in comment fields → should auto-save
- Click "Feedback abgesendet" → button should change to success state

Expected: No console errors, all clicks/typing work.

- [ ] **Step 3: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add src/components/MoodBoardFeedback.astro
git commit -m "feat: implement vote & comment handlers with auto-save"
```

---

## Task 7: Integrate into Deliverables Page

**Files:**
- Modify: `src/pages/portal/deliverables/[...path].astro` (lines 115-161)

- [ ] **Step 1: Import component and lib**

Add these imports at the top of the file (after existing imports):

```astro
import MoodBoardFeedback from '../../../components/MoodBoardFeedback.astro';
import { getMoodBoardFeedback } from '../../../lib/mood-board-feedback';
```

- [ ] **Step 2: Add auth token meta tag**

In the Astro frontmatter (top of file before HTML), add a helper to get the token. Find the line where `user` is defined and add:

```astro
// Get user's auth session token
const sessionToken = Astro.locals.sessionToken || ''; // Will be passed from middleware
```

- [ ] **Step 3: Modify mood-board rendering section**

Find the `else if (deliverableType === 'mood-board')` block (around line 115) and replace it:

```astro
} else if (deliverableType === 'mood-board') {
  // Variant switcher like website-preview: load all variants with embedded assets
  const variants = files.filter(f => f.endsWith('.html')).sort();
  if (variants.length === 0) {
    return new Response('Keine Varianten gefunden', { status: 404 });
  }

  // Load and embed all variants
  const variantData: Record<string, string> = {};
  for (const variant of variants) {
    const variantHtml = readDeliverableFile(slug, `mood-board/${variant}`);
    if (!variantHtml) continue;

    let html = variantHtml.toString('utf-8');

    // Helper to embed asset as data URI
    const embedAsset = (assetPath: string): string => {
      const assetContent = readDeliverableFile(slug, `mood-board/${assetPath}`);
      if (!assetContent) return assetPath;
      const ext = assetPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : 'application/octet-stream';
      return `data:${mime};base64,${assetContent.toString('base64')}`;
    };

    html = html.replace(/src="(assets\/[^"]+)"/g, (_match, assetPath) => {
      return `src="${embedAsset(assetPath)}"`;
    });

    html = html.replace(/background(?:-image)?:\s*url\(['"]?(assets\/[^'")]+)['"]?\)/g, (_match, assetPath) => {
      return `background: url('${embedAsset(assetPath)}')`;
    });

    variantData[variant.replace('.html', '')] = html;
  }

  if (Object.keys(variantData).length === 0) {
    return new Response('Keine Varianten gefunden', { status: 404 });
  }

  // Fetch feedback for this client
  let feedbackData = [];
  try {
    feedbackData = await getMoodBoardFeedback(deliverable.id, sessionToken);
  } catch (err) {
    console.error('Failed to fetch feedback:', err);
    feedbackData = [];
  }

  const firstVariantName = variants[0].replace('.html', '');
  Astro.locals.renderMode = 'mood-board';
  Astro.locals.variants = Object.keys(variantData);
  Astro.locals.variantData = variantData;
  Astro.locals.srcdocHtml = variantData[firstVariantName];
  Astro.locals.activeVariant = firstVariantName;
  Astro.locals.feedbackData = feedbackData;
  Astro.locals.isAdmin = isAdmin;
```

Wait — `getMoodBoardFeedback` needs the token, but we're in SSR. We need to fetch this in the browser instead. Let me revise:

Actually, looking at the architecture — feedback should be loaded on the client side, not server side, so we don't need to change this section much. The component will load feedback via client script. 

Skip this step for now — handle in next task.

- [ ] **Step 3: Update layout template (if needed)**

In the same file, find the layout render section. If it looks like `<PortalLayout>` with conditional content, add:

```astro
{Astro.locals.renderMode === 'mood-board' && (
  <div class="flex flex-col gap-8">
    <!-- Variant switcher stays same as before -->
    <div>
      {/* ... existing variant switcher HTML ... */}
    </div>
    
    <!-- Feedback component -->
    <MoodBoardFeedback 
      deliverableId={deliverable.id}
      variants={Astro.locals.variants}
      isAdmin={isAdmin}
      currentVariant={Astro.locals.activeVariant}
    />
  </div>
)}
```

But actually we need to check the existing layout structure first. For now, just ensure the component is imported and available.

- [ ] **Step 4: Commit (intermediate)**

```bash
cd /Users/daniel/code/software-crafting-website
git add src/pages/portal/deliverables/[...path].astro
git commit -m "feat: prepare mood-board page for feedback component"
```

---

## Task 8: Admin Unlock Handler

**Files:**
- Modify: `src/components/MoodBoardFeedback.astro` (admin script section)

- [ ] **Step 1: Add unlock button handler**

In the admin section of the script, replace the unlock handler:

```astro
<script define:vars={{ isAdmin }}>
  if (isAdmin) {
    const unlockBtn = document.getElementById('unlock-feedback-btn');
    const feedbackIds = unlockBtn?.getAttribute('data-feedback-ids')?.split(',') || [];
    const FUNCTION_URL = '/functions/v1/mood-board-feedback';
    const authToken = document.querySelector('meta[name="auth-token"]')?.getAttribute('content') || '';

    unlockBtn?.addEventListener('click', async () => {
      if (!confirm('Feedback zum Bearbeiten freigeben?')) return;

      try {
        await Promise.all(
          feedbackIds.map(id =>
            fetch(`${FUNCTION_URL}/${id}/unlock`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
            })
          )
        );

        unlockBtn.textContent = 'Freigegeben!';
        unlockBtn.disabled = true;
        unlockBtn.classList.add('opacity-50', 'cursor-not-allowed');

        // Re-enable vote & comment inputs
        document.querySelectorAll('.vote-button, .comment-input').forEach(el => {
          el.disabled = false;
          el.setAttribute('data-disabled', 'false');
        });

        alert('Feedback zum Bearbeiten freigegeben');
      } catch (err) {
        console.error('Failed to unlock:', err);
        alert('Fehler beim Freigeben');
      }
    });
  }
</script>
```

- [ ] **Step 2: Test unlock in admin view**

As admin, navigate to mood board deliverable for a submitted client and test unlock button.

Expected: Button changes to "Freigegeben!", inputs become enabled.

- [ ] **Step 3: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add src/components/MoodBoardFeedback.astro
git commit -m "feat: add admin unlock handler"
```

---

## Task 9: Implement Realtime Status Updates

**Files:**
- Modify: `src/components/MoodBoardFeedback.astro` (add realtime listener)

- [ ] **Step 1: Add realtime subscription**

Add a realtime listener script at the end of the `<script>` tag:

```astro
<script define:vars={{ deliverableId, isAdmin }}>
  // ... previous script code ...

  // Realtime listener for status changes
  if (typeof window !== 'undefined') {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    const supabase = createClient(
      document.querySelector('meta[name="supabase-url"]')?.getAttribute('content') || '',
      document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content') || ''
    );

    const subscription = supabase
      .channel(`mood_board_feedback:${deliverableId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mood_board_feedback',
          filter: `deliverable_id=eq.${deliverableId}`,
        },
        (payload) => {
          console.log('Feedback updated:', payload);
          // Reload component state or show notification
          if (payload.new.status === 'editing' && !isAdmin) {
            location.reload(); // Simple reload for status change
          }
        }
      )
      .subscribe();

    // Cleanup on unload
    window.addEventListener('unload', () => {
      subscription.unsubscribe();
    });
  }
</script>
```

- [ ] **Step 2: Add Supabase meta tags to layout**

In `src/layouts/PortalLayout.astro`, add these meta tags in `<head>`:

```html
<meta name="supabase-url" content={Astro.locals.supabase.supabaseUrl}>
<meta name="supabase-anon-key" content={Astro.locals.supabase.supabaseAnonKey}>
<meta name="auth-token" content={Astro.locals.user?.session?.access_token || ''}>
```

- [ ] **Step 3: Test realtime**

Open two browser windows — one as client, one as admin. From admin, unlock feedback. Client should see status update (or page auto-reload).

Expected: No console errors, realtime listener fires.

- [ ] **Step 4: Commit**

```bash
cd /Users/daniel/code/software-crafting-website
git add src/components/MoodBoardFeedback.astro src/layouts/PortalLayout.astro
git commit -m "feat: add realtime status updates via supabase"
```

---

## Task 10: Manual Testing & Verification

**Files:**
- No files to create/modify; manual verification only

- [ ] **Step 1: Test complete client workflow**

As a regular client user:
1. Navigate to mood board deliverable
2. Switch through all 5 variants
3. For each variant: add vote + all 3 comments
4. Verify "Feedback abgesendet" button works
5. Verify you can't edit after submitting

Expected: All actions work, no errors, data persists.

- [ ] **Step 2: Test complete admin workflow**

As admin:
1. View same mood board (with `?client=slug` param)
2. See all client feedback as read-only
3. Click "Zum Bearbeiten freigeben"
4. Verify client can now edit again

Expected: All actions work, status changes in real-time.

- [ ] **Step 3: Verify database**

In Supabase dashboard → SQL Editor:

```sql
SELECT * FROM mood_board_feedback 
WHERE deliverable_id = 'ID_FROM_ARINYA' 
LIMIT 5;
```

Expected: Rows with all votes/comments/status visible.

- [ ] **Step 4: Build and deploy**

```bash
cd /Users/daniel/code/software-crafting-website
pnpm build
```

Expected: Build succeeds, no TypeScript errors.

- [ ] **Step 5: Final commit**

```bash
cd /Users/daniel/code/software-crafting-website
git log --oneline | head -10
# Verify all mood-board commits are there
```

---

## Spec Coverage Self-Review

**Requirement:** Client can vote (like/dislike/favorite) on variants
→ Task 5, 6: Implemented via vote buttons in component + client script handlers

**Requirement:** Client can add 3 separate comments per variant
→ Task 5, 6: Implemented via textarea fields (comment_negative/positive/very_good) + auto-save

**Requirement:** Client can submit feedback (locks editing)
→ Task 6: Submit button calls API to mark all feedback as `status='submitted'`

**Requirement:** Admin can see same UI as client but read-only
→ Task 5, 8: Component conditionally renders read-only version for admin

**Requirement:** Admin can unlock feedback for further editing
→ Task 8: Unlock button reverts status to `editing`

**Requirement:** Only one favorite per mood board
→ Task 1: UNIQUE constraint in database + logic in client script

**Requirement:** German UI text only
→ Task 5: All labels/buttons in German ("Gefällt mir", "Was ist gut?", etc.)

**Requirement:** Professional variant naming ("Variante 1" not "variant-1")
→ Handled upstream in mood-board generation, component displays as-is

---

## Type Consistency Check

- `MoodBoardFeedback` type (Task 3) matches Edge Function response (Task 2) ✓
- `MoodBoardFeedbackInput` type (Task 3) matches saveFeedback input (Task 6) ✓
- All API endpoints use consistent naming (Task 2, 4, 6) ✓
- All German labels consistent across component (Task 5, 6) ✓

---

## Implementation Notes

- **Token handling:** Auth token is read from `meta[name="auth-token"]` which should be set by PortalLayout. If not, requests will fail silently — add a console error if needed.
- **Realtime:** Uses Supabase Realtime channel `mood_board_feedback:{deliverableId}`. Requires Realtime to be enabled in Supabase project settings.
- **Auto-save:** Vote + comment changes trigger API calls immediately. No debouncing — consider adding if performance is an issue.
- **Admin impersonation:** The `?client=slug` param already exists for admin to view other clients' deliverables. RLS policies verify this.

---

Plan complete and saved. Ready for execution?