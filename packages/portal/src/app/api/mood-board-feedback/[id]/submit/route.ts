import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Verify feedback row exists
    const { data: feedbackRow, error: fetchError } = await supabase
      .from('mood_board_feedback')
      .select('client_id')
      .eq('id', id)
      .single();

    if (fetchError || !feedbackRow) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Verify ownership: feedback must belong to authenticated user's client
    const { data: userClient, error: userClientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (userClientError || !userClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (feedbackRow.client_id !== userClient.id) {
      return NextResponse.json({ error: 'Forbidden: not your feedback' }, { status: 403 });
    }

    // Mark as submitted
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
