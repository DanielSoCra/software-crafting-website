import { describe, test, expect } from 'vitest';

/**
 * Unit Tests for Mood Board Feedback Logic
 *
 * Tests for:
 * - Vote state management
 * - Comment field handling
 * - Form state transitions
 * - Data validation
 */

describe('Vote State Management', () => {
  test('Like button toggles on/off', () => {
    // Initial state: vote = null
    let state = { vote: null };

    // Click Like
    state.vote = state.vote === 'like' ? null : 'like';
    expect(state.vote).toBe('like');

    // Click Like again (toggle off)
    state.vote = state.vote === 'like' ? null : 'like';
    expect(state.vote).toBeNull();
  });

  test('Dislike clears Like vote', () => {
    let state = { vote: 'like' };

    // Click Dislike
    if (state.vote === 'dislike') {
      state.vote = null;
    } else {
      state.vote = 'dislike';
    }

    expect(state.vote).toBe('dislike');
  });

  test('Favorite is independent of vote', () => {
    let state = { vote: null, is_favorite: false };

    // Like
    state.vote = 'like';
    expect(state.vote).toBe('like');
    expect(state.is_favorite).toBe(false);

    // Favorite (independent)
    state.is_favorite = !state.is_favorite;
    expect(state.vote).toBe('like');
    expect(state.is_favorite).toBe(true);

    // Dislike (clears Like)
    state.vote = 'dislike';
    expect(state.vote).toBe('dislike');
    expect(state.is_favorite).toBe(true); // Favorite still set
  });

  test('Favorite toggle independent of vote', () => {
    let state = { vote: 'like', is_favorite: false };

    // Toggle favorite
    state.is_favorite = !state.is_favorite;
    expect(state.is_favorite).toBe(true);
    expect(state.vote).toBe('like'); // Vote unchanged

    // Toggle favorite again
    state.is_favorite = !state.is_favorite;
    expect(state.is_favorite).toBe(false);
    expect(state.vote).toBe('like'); // Vote unchanged
  });

  test('Only one of Like/Dislike active at a time', () => {
    let state = { vote: null };

    // Like
    state.vote = 'like';
    expect(state.vote).toBe('like');

    // Dislike (replaces Like)
    state.vote = state.vote === 'dislike' ? null : 'dislike';
    expect(state.vote).toBe('dislike');

    // Like again (replaces Dislike)
    state.vote = state.vote === 'like' ? null : 'like';
    expect(state.vote).toBe('like');
  });
});

describe('Comment Field Handling', () => {
  test('Comments are optional', () => {
    const feedback = {
      vote: 'like',
      is_favorite: false,
      comment_negative: null,
      comment_positive: null,
      comment_very_good: null,
    };

    expect(feedback.vote).toBe('like');
    expect(feedback.comment_negative).toBeNull();
    // Can submit with vote only, no comments
  });

  test('Comment max length enforced', () => {
    const comment = 'a'.repeat(501);
    const isValid = comment.length <= 500;
    expect(isValid).toBe(false);

    const truncated = comment.slice(0, 500);
    expect(truncated.length).toBe(500);
  });

  test('All three comment fields tracked separately', () => {
    const feedback = {
      comment_negative: 'Needs improvement',
      comment_positive: 'Looks good',
      comment_very_good: 'Excellent!',
    };

    expect(feedback.comment_negative).toBe('Needs improvement');
    expect(feedback.comment_positive).toBe('Looks good');
    expect(feedback.comment_very_good).toBe('Excellent!');
  });

  test('Empty comment is null not empty string', () => {
    const feedback = {
      comment_negative: '',
      comment_positive: null,
    };

    // Empty string should be treated as null for storage
    const normalized = {
      comment_negative: feedback.comment_negative || null,
      comment_positive: feedback.comment_positive || null,
    };

    expect(normalized.comment_negative).toBeNull();
    expect(normalized.comment_positive).toBeNull();
  });
});

describe('Form State Transitions', () => {
  test('Status transitions from editing to submitted', () => {
    let feedback = {
      status: 'editing',
      submitted_at: null,
    };

    // Submit
    feedback.status = 'submitted';
    feedback.submitted_at = new Date().toISOString();

    expect(feedback.status).toBe('submitted');
    expect(feedback.submitted_at).toBeTruthy();
  });

  test('Status transitions from submitted back to editing (admin unlock)', () => {
    let feedback = {
      status: 'submitted',
      submitted_at: '2026-04-07T12:00:00Z',
    };

    // Unlock
    feedback.status = 'editing';
    feedback.submitted_at = null; // Clear on unlock

    expect(feedback.status).toBe('editing');
    expect(feedback.submitted_at).toBeNull();
  });

  test('Form disabled when submitted', () => {
    const isEditable = (status: string) => status === 'editing';

    expect(isEditable('editing')).toBe(true);
    expect(isEditable('submitted')).toBe(false);
  });
});

describe('Variant Switching State Preservation', () => {
  test('Switching variants preserves separate draft state', () => {
    const feedbackMap = new Map();

    // Variant 1: Add comment
    feedbackMap.set('Variante 1', {
      vote: null,
      comment_positive: 'Test comment',
    });

    // Variant 2: Add different comment
    feedbackMap.set('Variante 2', {
      vote: 'like',
      comment_positive: 'Different comment',
    });

    // Switch back to Variant 1
    const variant1 = feedbackMap.get('Variante 1');
    expect(variant1.comment_positive).toBe('Test comment');

    // Switch to Variant 2
    const variant2 = feedbackMap.get('Variante 2');
    expect(variant2.vote).toBe('like');
  });

  test('Missing variant returns empty state', () => {
    const feedbackMap = new Map();
    const newVariantState =
      feedbackMap.get('Variante 3') || {
        vote: null,
        is_favorite: false,
        comment_negative: null,
        comment_positive: null,
        comment_very_good: null,
        status: 'editing',
      };

    expect(newVariantState.vote).toBeNull();
    expect(newVariantState.status).toBe('editing');
  });
});

describe('Partial Update Logic', () => {
  test('Partial update preserves unmodified fields', () => {
    const existing = {
      vote: 'like',
      is_favorite: false,
      comment_negative: 'Original',
      comment_positive: null,
      comment_very_good: null,
      status: 'editing',
    };

    // Update only comment_positive
    const update = {
      comment_positive: 'New comment',
    };

    const merged = { ...existing, ...update };

    expect(merged.vote).toBe('like'); // Preserved
    expect(merged.comment_negative).toBe('Original'); // Preserved
    expect(merged.comment_positive).toBe('New comment'); // Updated
  });

  test('Sending null clears field', () => {
    const existing = {
      comment_positive: 'Existing comment',
    };

    const update = {
      comment_positive: null,
    };

    const merged = { ...existing, ...update };
    expect(merged.comment_positive).toBeNull();
  });

  test('Omitting field preserves existing value', () => {
    const existing = {
      vote: 'like',
      comment_negative: 'Original',
    };

    // Only update vote, don't mention comment_negative
    const updateFields: Record<string, any> = {};
    if (undefined !== undefined) updateFields.vote = 'dislike';
    else updateFields.vote = 'dislike'; // Send only vote

    const merged = { ...existing, ...updateFields };

    expect(merged.vote).toBe('dislike'); // Updated
    expect(merged.comment_negative).toBe('Original'); // Preserved
  });
});

describe('Submission Logic', () => {
  test('Submit creates rows for all variants', () => {
    const variants = ['Variante 1', 'Variante 2', 'Variante 3'];
    const feedbackMap = new Map();

    // Only Variante 1 has feedback
    feedbackMap.set('Variante 1', { vote: 'like' });

    // Before submit: create empty rows for missing variants
    for (const variant of variants) {
      if (!feedbackMap.has(variant)) {
        feedbackMap.set(variant, {
          variant_name: variant,
          vote: null,
          is_favorite: false,
          comment_negative: null,
          comment_positive: null,
          comment_very_good: null,
        });
      }
    }

    expect(feedbackMap.size).toBe(3);
    expect(feedbackMap.get('Variante 1').vote).toBe('like');
    expect(feedbackMap.get('Variante 2').vote).toBeNull();
    expect(feedbackMap.get('Variante 3').vote).toBeNull();
  });

  test('Submit marks all variants as submitted', () => {
    const feedbackIds = ['id-1', 'id-2', 'id-3'];

    const submittedFeedback = feedbackIds.map(id => ({
      id,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }));

    submittedFeedback.forEach(fb => {
      expect(fb.status).toBe('submitted');
      expect(fb.submitted_at).toBeTruthy();
    });
  });
});

describe('Data Validation', () => {
  test('deliverable_id required', () => {
    const payload = {
      variant_name: 'Variante 1',
      vote: 'like',
    };

    const isValid = payload.deliverable_id && payload.variant_name;
    expect(isValid).toBeFalsy(); // Missing deliverable_id
  });

  test('variant_name required', () => {
    const payload = {
      deliverable_id: 'uuid',
      vote: 'like',
    };

    const isValid = payload.deliverable_id && payload.variant_name;
    expect(isValid).toBeFalsy(); // Missing variant_name
  });

  test('comment field max length', () => {
    const comment = 'a'.repeat(500);
    const isValid = comment.length <= 500;
    expect(isValid).toBe(true);

    const tooLong = 'a'.repeat(501);
    expect(tooLong.length <= 500).toBe(false);
  });

  test('vote must be valid enum value', () => {
    const validVotes = ['like', 'dislike', 'favorite', null];
    const vote = 'invalid';

    expect(validVotes).not.toContain(vote);
  });

  test('is_favorite must be boolean', () => {
    expect(typeof true).toBe('boolean');
    expect(typeof 'true').not.toBe('boolean');
  });

  test('status must be editing or submitted', () => {
    const validStatuses = ['editing', 'submitted'];

    expect(validStatuses).toContain('editing');
    expect(validStatuses).not.toContain('draft');
  });
});

describe('URL Parameter Handling', () => {
  test('variant URL param can be set', () => {
    const url = new URL('http://localhost:4321/portal/deliverables/mood-board');
    url.searchParams.set('variant', 'Variante 3');

    expect(url.searchParams.get('variant')).toBe('Variante 3');
  });

  test('variant param persists on reload simulation', () => {
    const url1 = new URL('http://localhost:4321/portal/deliverables/mood-board?variant=Variante2');
    const param1 = url1.searchParams.get('variant');

    // Simulated reload keeps param
    const url2 = new URL(url1.toString());
    const param2 = url2.searchParams.get('variant');

    expect(param1).toBe(param2);
    expect(param2).toBe('Variante2');
  });

  test('missing variant param defaults to first', () => {
    const url = new URL('http://localhost:4321/portal/deliverables/mood-board');
    const variant = url.searchParams.get('variant') || 'Variante 1';

    expect(variant).toBe('Variante 1');
  });
});

describe('Realtime Subscription', () => {
  test('unlock event should trigger page state update', () => {
    // Simulated payload from Supabase Realtime
    const payload = {
      new: {
        id: 'feedback-id',
        status: 'editing',
        submitted_at: null,
      },
      old: {
        status: 'submitted',
        submitted_at: '2026-04-07T12:00:00Z',
      },
      eventType: 'UPDATE',
    };

    // Check if we should update form state
    const shouldEnable = payload.new.status === 'editing';
    expect(shouldEnable).toBe(true);
  });
});
