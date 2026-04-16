import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isUserAdmin } from '@/lib/supabase-server';
import { apiError } from '@/lib/api-error';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  if (!(await isUserAdmin(supabase, user.id))) {
    return apiError(403, 'ADMIN_ONLY', 'Admin only');
  }

  const { id } = await params;
  const deliverableId = req.nextUrl.searchParams.get('deliverable_id');
  if (!deliverableId) {
    return apiError(400, 'INVALID_INPUT', 'deliverable_id required');
  }

  // Scope the update to the provided deliverable so a stray id cannot flip
  // an unrelated row. If the combination doesn't match, zero rows update
  // and .single() returns PGRST116 which we surface as 404.
  const { data, error } = await supabase
    .from('mood_board_feedback')
    .update({
      status: 'editing',
      submitted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('deliverable_id', deliverableId)
    .select()
    .single();

  if (error && error.code === 'PGRST116') {
    return apiError(404, 'NOT_FOUND', 'Not found');
  }
  if (error) {
    console.error('mood-board-feedback unlock error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  return NextResponse.json(data);
}
