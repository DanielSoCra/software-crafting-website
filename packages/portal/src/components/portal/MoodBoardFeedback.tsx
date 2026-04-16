'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import type { MoodBoardFeedback as MoodBoardFeedbackType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
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
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
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
  }, [deliverableId]);

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

    // A partial unique index enforces at most one is_favorite per
    // (deliverable_id, client_id). If we're turning favorite ON, clear it
    // on any other variant first — otherwise the upsert hits a unique violation.
    const priorFavorite = updated.is_favorite
      ? Object.entries(feedbackByVariant).find(
          ([name, vfb]) => name !== activeVariant && vfb.is_favorite,
        )
      : null;

    setFeedbackByVariant(prev => {
      const next = { ...prev, [activeVariant]: updated };
      if (priorFavorite) {
        next[priorFavorite[0]] = { ...priorFavorite[1], is_favorite: false };
      }
      return next;
    });

    if (priorFavorite) {
      // Save the demotion first so the server's unique index is free when
      // the new favorite upsert arrives.
      void saveFeedback(priorFavorite[0], { is_favorite: false }).then(() =>
        saveFeedback(activeVariant, { vote: updated.vote, is_favorite: updated.is_favorite }),
      );
    } else {
      saveFeedback(activeVariant, { vote: updated.vote, is_favorite: updated.is_favorite });
    }
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
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
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
        credentials: 'same-origin',
      });
      const allFeedback = await response.json();
      const feedbackIds = allFeedback.map((f: MoodBoardFeedbackType) => f.id);

      // 3. Submit all feedback rows
      await Promise.all(
        feedbackIds.map((id: string) =>
          fetch(`${FUNCTION_URL}/${id}/submit`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
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
        credentials: 'same-origin',
      });
      const allFeedback = await response.json();
      const feedbackIds = allFeedback.map((f: MoodBoardFeedbackType) => f.id);

      await Promise.all(
        feedbackIds.map((id: string) =>
          fetch(`${FUNCTION_URL}/${id}/unlock?deliverable_id=${deliverableId}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
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

          {/* Read-only feedback display — all variants at once so admin can't
              miss feedback left on a non-active tab. */}
          <div className="space-y-6">
            {variants.map((variant) => {
              const vfb = feedbackByVariant[variant] ?? getEmptyFeedback();
              const hasAnyContent =
                vfb.vote !== null ||
                vfb.is_favorite ||
                vfb.comment_negative ||
                vfb.comment_positive ||
                vfb.comment_very_good;

              return (
                <Card key={variant}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{variant}</h3>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {vfb.vote === 'like' && <span>❤️ Gefällt mir</span>}
                        {vfb.vote === 'dislike' && <span>👎 Gefällt mir nicht</span>}
                        {vfb.is_favorite && <span>⭐ Favorit</span>}
                        {vfb.vote === null && !vfb.is_favorite && <span>Keine Bewertung</span>}
                      </div>
                    </div>

                    {!hasAnyContent && (
                      <p className="text-xs text-muted-foreground italic">Kein Feedback.</p>
                    )}

                    {vfb.comment_negative && (
                      <div>
                        <FieldLabel className="text-muted-foreground mb-1">
                          Was gefällt nicht:
                        </FieldLabel>
                        <p className="text-sm text-muted-foreground">{vfb.comment_negative}</p>
                      </div>
                    )}

                    {vfb.comment_positive && (
                      <div>
                        <FieldLabel className="text-muted-foreground mb-1">
                          Was ist gut:
                        </FieldLabel>
                        <p className="text-sm text-muted-foreground">{vfb.comment_positive}</p>
                      </div>
                    )}

                    {vfb.comment_very_good && (
                      <div>
                        <FieldLabel className="text-muted-foreground mb-1">
                          Was ist sehr gut:
                        </FieldLabel>
                        <p className="text-sm text-muted-foreground">{vfb.comment_very_good}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
        <FieldGroup>
          <Field>
            <FieldLabel>Deine Bewertung</FieldLabel>
            <div className="flex gap-3">
              <Button
                variant={fb.vote === 'like' ? 'default' : 'outline'}
                onClick={() => handleVote('like')}
                disabled={isSubmitted || submitting}
              >
                ❤️ Gefällt mir
              </Button>
              <Button
                variant={fb.vote === 'dislike' ? 'default' : 'outline'}
                onClick={() => handleVote('dislike')}
                disabled={isSubmitted || submitting}
              >
                👎 Gefällt mir nicht
              </Button>
              <Button
                variant={fb.is_favorite ? 'default' : 'outline'}
                onClick={() => handleVote('favorite')}
                disabled={isSubmitted || submitting}
              >
                ⭐ Favorit
              </Button>
            </div>
          </Field>
        </FieldGroup>

        {/* Comments */}
        <FieldGroup>
          <Field>
            <FieldLabel>Was gefällt dir nicht?</FieldLabel>
            <Textarea
              value={fb.comment_negative}
              onChange={(e) => handleCommentChange('comment_negative', e.target.value)}
              onBlur={() => handleCommentBlur('comment_negative')}
              placeholder="Deine Gedanken..."
              maxLength={500}
              disabled={isSubmitted || submitting}
            />
            <FieldDescription>Max. 500 Zeichen</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Was ist gut?</FieldLabel>
            <Textarea
              value={fb.comment_positive}
              onChange={(e) => handleCommentChange('comment_positive', e.target.value)}
              onBlur={() => handleCommentBlur('comment_positive')}
              placeholder="Deine Gedanken..."
              maxLength={500}
              disabled={isSubmitted || submitting}
            />
            <FieldDescription>Max. 500 Zeichen</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Was ist sehr gut?</FieldLabel>
            <Textarea
              value={fb.comment_very_good}
              onChange={(e) => handleCommentChange('comment_very_good', e.target.value)}
              onBlur={() => handleCommentBlur('comment_very_good')}
              placeholder="Deine Gedanken..."
              maxLength={500}
              disabled={isSubmitted || submitting}
            />
            <FieldDescription>Max. 500 Zeichen</FieldDescription>
          </Field>
        </FieldGroup>

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
