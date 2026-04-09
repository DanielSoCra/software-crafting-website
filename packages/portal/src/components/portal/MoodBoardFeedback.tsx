'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import type { MoodBoardFeedback as MoodBoardFeedbackType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface VariantFeedback {
  vote: 'like' | 'dislike' | null;
  is_favorite: boolean;
  comment_negative: string;
  comment_positive: string;
  comment_very_good: string;
}

interface Props {
  deliverableId: string;
  variants: string[];
  isAdmin: boolean;
  currentVariant: string;
  feedbackData: MoodBoardFeedbackType[];
  authToken: string;
}

function getEmptyFeedback(): VariantFeedback {
  return {
    vote: null,
    is_favorite: false,
    comment_negative: '',
    comment_positive: '',
    comment_very_good: '',
  };
}

const FUNCTION_URL = '/portal/api/mood-board-feedback';

export default function MoodBoardFeedback({
  deliverableId,
  variants,
  isAdmin,
  currentVariant,
  feedbackData,
  authToken,
}: Props) {
  const [feedbackByVariant, setFeedbackByVariant] = useState<Record<string, VariantFeedback>>(() => {
    const map: Record<string, VariantFeedback> = {};
    for (const fb of feedbackData) {
      map[fb.variant_name] = {
        // 'favorite' in MoodBoardVote is a legacy value — favorite is tracked via is_favorite boolean
        vote: fb.vote === 'favorite' ? null : (fb.vote as 'like' | 'dislike' | null),
        is_favorite: fb.is_favorite,
        comment_negative: fb.comment_negative || '',
        comment_positive: fb.comment_positive || '',
        comment_very_good: fb.comment_very_good || '',
      };
    }
    return map;
  });

  const [activeVariant, setActiveVariant] = useState(currentVariant);
  const [isSubmitted, setIsSubmitted] = useState(
    feedbackData.some(f => f.status === 'submitted')
  );
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const fb = feedbackByVariant[activeVariant] || getEmptyFeedback();

  // --- API ---

  const saveFeedback = useCallback(async (variantName: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliverable_id: deliverableId,
          variant_name: variantName,
          ...updates,
        }),
      });
      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      return await response.json();
    } catch (err) {
      console.error('Failed to save feedback:', err);
      alert('Fehler beim Speichern');
    }
  }, [authToken, deliverableId]);

  // --- Vote logic ---

  function handleVote(voteType: 'like' | 'dislike' | 'favorite') {
    const current = feedbackByVariant[activeVariant] || getEmptyFeedback();
    let updated: VariantFeedback;

    if (voteType === 'favorite') {
      updated = { ...current, is_favorite: !current.is_favorite };
    } else {
      // Reset is_favorite when voting like/dislike (matches original behavior)
      updated = {
        ...current,
        vote: current.vote === voteType ? null : voteType,
        is_favorite: false,
      };
    }

    setFeedbackByVariant(prev => ({ ...prev, [activeVariant]: updated }));
    saveFeedback(activeVariant, { vote: updated.vote, is_favorite: updated.is_favorite });
  }

  // --- Comment handlers ---

  function handleCommentChange(
    field: 'comment_negative' | 'comment_positive' | 'comment_very_good',
    value: string
  ) {
    setFeedbackByVariant(prev => ({
      ...prev,
      [activeVariant]: { ...(prev[activeVariant] || getEmptyFeedback()), [field]: value },
    }));
  }

  function handleCommentBlur(field: 'comment_negative' | 'comment_positive' | 'comment_very_good') {
    const current = feedbackByVariant[activeVariant];
    if (current) {
      saveFeedback(activeVariant, { [field]: current[field] || null });
    }
  }

  // --- Submit ---

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // 1. Ensure all variants have feedback rows
      for (const variant of variants) {
        const createResponse = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliverable_id: deliverableId,
            variant_name: variant,
          }),
        });
        if (!createResponse.ok) {
          const err = await createResponse.json();
          console.warn(`Failed to ensure variant ${variant} exists:`, err);
        }
      }

      // 2. Fetch all feedback rows
      const response = await fetch(`${FUNCTION_URL}?deliverable_id=${deliverableId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const allFeedback = await response.json();
      const feedbackIds = allFeedback.map((f: MoodBoardFeedbackType) => f.id);

      // 3. Submit all feedback rows
      await Promise.all(
        feedbackIds.map((id: string) =>
          fetch(`${FUNCTION_URL}/${id}/submit`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          })
        )
      );

      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit:', err);
      alert('Fehler beim Absenden');
    } finally {
      setSubmitting(false);
    }
  }

  // --- Admin unlock ---

  async function handleUnlock() {
    setUnlocking(true);
    try {
      // Fetch all feedback IDs for this deliverable
      const response = await fetch(`${FUNCTION_URL}?deliverable_id=${deliverableId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const allFeedback = await response.json();
      const feedbackIds = allFeedback.map((f: MoodBoardFeedbackType) => f.id);

      await Promise.all(
        feedbackIds.map((id: string) =>
          fetch(`${FUNCTION_URL}/${id}/unlock`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          })
        )
      );

      setUnlocked(true);
      setIsSubmitted(false);
    } catch (err) {
      console.error('Failed to unlock:', err);
      alert('Fehler beim Freigeben');
    } finally {
      setUnlocking(false);
    }
  }

  // --- Variant change listener ---

  useEffect(() => {
    const handler = (e: Event) => {
      const variant = (e as CustomEvent<{ variant: string }>).detail.variant;
      setActiveVariant(variant);
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant);
      window.history.replaceState({}, '', url);
    };
    document.addEventListener('mood-board-variant-changed', handler);
    return () => document.removeEventListener('mood-board-variant-changed', handler);
  }, []);

  // --- Realtime subscription ---

  useEffect(() => {
    if (isAdmin) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`mood_board_feedback:${deliverableId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mood_board_feedback',
        filter: `deliverable_id=eq.${deliverableId}`,
      }, (payload: { new: { status: string } }) => {
        if (payload.new.status === 'editing') {
          location.reload();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [deliverableId, isAdmin]);

  // --- Render: Admin view ---

  if (isAdmin) {
    return (
      <div className="mt-8 pt-8 border-t border-border">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                {isSubmitted ? (
                  <>
                    <strong>Status: Feedback abgesendet</strong>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 border-amber-500 text-amber-500 hover:bg-amber-500/10"
                      onClick={handleUnlock}
                      disabled={unlocking || unlocked}
                    >
                      {unlocked ? 'Freigegeben!' : unlocking ? 'Wird freigegeben...' : 'Zum Bearbeiten freigeben'}
                    </Button>
                  </>
                ) : (
                  <strong>Status: Kunde bearbeitet noch</strong>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Read-only feedback display */}
          <div className="space-y-4 opacity-75">
            <p className="text-sm font-semibold text-muted-foreground">
              Bewertung:{' '}
              {fb.vote === 'like'
                ? '❤️ Gefällt mir'
                : fb.vote === 'dislike'
                  ? '👎 Gefällt mir nicht'
                  : fb.is_favorite
                    ? '⭐ Favorit'
                    : 'Keine Bewertung'}
            </p>

            {fb.comment_negative && (
              <div>
                <Label className="block text-sm font-semibold text-muted-foreground mb-1">
                  Was gefällt nicht:
                </Label>
                <p className="text-muted-foreground">{fb.comment_negative}</p>
              </div>
            )}

            {fb.comment_positive && (
              <div>
                <Label className="block text-sm font-semibold text-muted-foreground mb-1">
                  Was ist gut:
                </Label>
                <p className="text-muted-foreground">{fb.comment_positive}</p>
              </div>
            )}

            {fb.comment_very_good && (
              <div>
                <Label className="block text-sm font-semibold text-muted-foreground mb-1">
                  Was ist sehr gut:
                </Label>
                <p className="text-muted-foreground">{fb.comment_very_good}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Client view ---

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <div className="space-y-6">
        {/* Voting */}
        <div className="space-y-2">
          <Label className="block text-sm font-semibold">Deine Bewertung</Label>
          <div className="flex gap-3">
            <Button
              variant={fb.vote === 'like' ? 'default' : 'outline'}
              onClick={() => handleVote('like')}
              disabled={isSubmitted}
            >
              ❤️ Gefällt mir
            </Button>
            <Button
              variant={fb.vote === 'dislike' ? 'default' : 'outline'}
              onClick={() => handleVote('dislike')}
              disabled={isSubmitted}
            >
              👎 Gefällt mir nicht
            </Button>
            <Button
              variant={fb.is_favorite ? 'default' : 'outline'}
              onClick={() => handleVote('favorite')}
              disabled={isSubmitted}
            >
              ⭐ Favorit
            </Button>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-semibold mb-1">Was gefällt dir nicht?</Label>
            <Textarea
              value={fb.comment_negative}
              onChange={(e) => handleCommentChange('comment_negative', e.target.value)}
              onBlur={() => handleCommentBlur('comment_negative')}
              placeholder="Deine Gedanken..."
              maxLength={500}
              disabled={isSubmitted}
            />
            <p className="text-xs text-muted-foreground mt-1">Max. 500 Zeichen</p>
          </div>

          <div>
            <Label className="block text-sm font-semibold mb-1">Was ist gut?</Label>
            <Textarea
              value={fb.comment_positive}
              onChange={(e) => handleCommentChange('comment_positive', e.target.value)}
              onBlur={() => handleCommentBlur('comment_positive')}
              placeholder="Deine Gedanken..."
              maxLength={500}
              disabled={isSubmitted}
            />
            <p className="text-xs text-muted-foreground mt-1">Max. 500 Zeichen</p>
          </div>

          <div>
            <Label className="block text-sm font-semibold mb-1">Was ist sehr gut?</Label>
            <Textarea
              value={fb.comment_very_good}
              onChange={(e) => handleCommentChange('comment_very_good', e.target.value)}
              onBlur={() => handleCommentBlur('comment_very_good')}
              placeholder="Deine Gedanken..."
              maxLength={500}
              disabled={isSubmitted}
            />
            <p className="text-xs text-muted-foreground mt-1">Max. 500 Zeichen</p>
          </div>
        </div>

        {/* Submit */}
        {!isSubmitted ? (
          <Button
            variant="default"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Wird gesendet...' : 'Jetzt absenden'}
          </Button>
        ) : (
          <div className="rounded-lg bg-green-950/30 border border-green-600 text-green-400 text-center py-3 font-semibold">
            ✓ Danke für dein Feedback!
          </div>
        )}
      </div>
    </div>
  );
}
