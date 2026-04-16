import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { apiError } from '@/lib/api-error';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;

  // RLS on mood_board_feedback restricts UPDATE to rows owned by the caller's
  // client (while status='editing') or to admins. This mutation sets status
  // to 'submitted' which the trigger + policy combination ensures is only
  // writable by the row's owner.
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

  if (error && error.code === 'PGRST116') {
    return apiError(404, 'NOT_FOUND', 'Not found or forbidden');
  }
  if (error) {
    console.error('mood-board-feedback submit error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  return NextResponse.json(data);
}
