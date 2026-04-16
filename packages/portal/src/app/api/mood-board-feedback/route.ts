import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { apiError } from '@/lib/api-error';

const MAX_COMMENT_LENGTH = 500;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const deliverableId = req.nextUrl.searchParams.get('deliverable_id');
  if (!deliverableId) {
    return apiError(400, 'INVALID_INPUT', 'deliverable_id required');
  }

  // RLS enforces scope: clients see only their own feedback, admins see all.
  const { data, error } = await supabase
    .from('mood_board_feedback')
    .select('*')
    .eq('deliverable_id', deliverableId);

  if (error) {
    console.error('mood-board-feedback GET error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  const body = await req.json();
  const {
    deliverable_id,
    variant_name,
    vote,
    is_favorite,
    comment_negative,
    comment_positive,
    comment_very_good,
  } = body;

  if (!deliverable_id || !variant_name) {
    return apiError(400, 'INVALID_INPUT', 'deliverable_id and variant_name required');
  }
  if (typeof variant_name !== 'string' || variant_name.length > 100) {
    return apiError(400, 'INVALID_INPUT', 'variant_name too long');
  }
  if (vote !== undefined && vote !== null && !['like', 'dislike'].includes(vote)) {
    return apiError(400, 'INVALID_INPUT', 'Invalid vote value');
  }
  for (const [key, value] of Object.entries({ comment_negative, comment_positive, comment_very_good })) {
    if (value !== undefined && value !== null && typeof value === 'string' && value.length > MAX_COMMENT_LENGTH) {
      return apiError(400, 'INVALID_INPUT', `${key} exceeds ${MAX_COMMENT_LENGTH} characters`);
    }
  }

  // Derive client_id from the deliverable, not from the caller's client record.
  // RLS on deliverables restricts to the caller's own client or admin.
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables')
    .select('client_id')
    .eq('id', deliverable_id)
    .single();
  if (delError && delError.code !== 'PGRST116') {
    console.error('mood-board-feedback POST deliverable lookup error:', delError);
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  if (!deliverable) {
    return apiError(404, 'NOT_FOUND', 'Not found');
  }

  // Verify caller's own client matches the deliverable owner. Admins cannot
  // write client feedback (no admin INSERT policy on mood_board_feedback).
  const { data: myClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!myClient || myClient.id !== deliverable.client_id) {
    return apiError(403, 'FORBIDDEN', 'Forbidden');
  }

  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (vote !== undefined && vote !== null) updateFields.vote = vote;
  if (is_favorite !== undefined) updateFields.is_favorite = is_favorite;
  if (comment_negative !== undefined) updateFields.comment_negative = comment_negative;
  if (comment_positive !== undefined) updateFields.comment_positive = comment_positive;
  if (comment_very_good !== undefined) updateFields.comment_very_good = comment_very_good;

  const { data, error } = await supabase
    .from('mood_board_feedback')
    .upsert(
      {
        deliverable_id,
        client_id: deliverable.client_id,
        variant_name,
        ...updateFields,
      },
      { onConflict: 'deliverable_id,client_id,variant_name' },
    )
    .select()
    .single();

  if (error) {
    console.error('mood-board-feedback POST upsert error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  return NextResponse.json(data);
}
