import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser, getClientForUser } from '@/lib/supabase-admin';

const MAX_COMMENT_LENGTH = 500;

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliverableId = req.nextUrl.searchParams.get('deliverable_id');
    if (!deliverableId) {
      return NextResponse.json({ error: 'deliverable_id required' }, { status: 400 });
    }

    const client = await getClientForUser(user.id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('mood_board_feedback')
      .select('*')
      .eq('deliverable_id', deliverableId)
      .eq('client_id', client.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: 'deliverable_id and variant_name required' },
        { status: 400 },
      );
    }

    if (variant_name.length > 100) {
      return NextResponse.json({ error: 'variant_name too long' }, { status: 400 });
    }

    // Validate vote value
    if (vote !== undefined && vote !== null && !['like', 'dislike'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote value' }, { status: 400 });
    }

    // Validate comment field lengths
    if (comment_negative && comment_negative.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `comment_negative exceeds ${MAX_COMMENT_LENGTH} characters` },
        { status: 400 },
      );
    }
    if (comment_positive && comment_positive.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `comment_positive exceeds ${MAX_COMMENT_LENGTH} characters` },
        { status: 400 },
      );
    }
    if (comment_very_good && comment_very_good.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `comment_very_good exceeds ${MAX_COMMENT_LENGTH} characters` },
        { status: 400 },
      );
    }

    const client = await getClientForUser(user.id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Build partial update — only include provided fields
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (vote !== undefined && vote !== null) {
      updateFields.vote = vote;
    }
    if (is_favorite !== undefined) {
      updateFields.is_favorite = is_favorite;
    }
    if (comment_negative !== undefined) {
      updateFields.comment_negative = comment_negative;
    }
    if (comment_positive !== undefined) {
      updateFields.comment_positive = comment_positive;
    }
    if (comment_very_good !== undefined) {
      updateFields.comment_very_good = comment_very_good;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('mood_board_feedback')
      .upsert(
        {
          deliverable_id,
          client_id: client.id,
          variant_name,
          ...updateFields,
        },
        { onConflict: 'deliverable_id,client_id,variant_name' },
      )
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
