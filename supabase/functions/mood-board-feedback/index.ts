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

      // Upsert feedback — only include provided fields to preserve existing data
      const updateFields: Record<string, any> = {
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

      const { data, error } = await supabase
        .from('mood_board_feedback')
        .upsert({
          deliverable_id,
          client_id: client.id,
          variant_name,
          ...updateFields,
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
      // Extract ID from path: /functions/v1/mood-board-feedback/{id}/submit
      const pathSegments = pathname.split('/').filter(Boolean);
      const idIndex = pathSegments.indexOf('mood-board-feedback');
      const id = idIndex >= 0 ? pathSegments[idIndex + 1] : null;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Invalid path format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // VERIFY OWNERSHIP: Check that this feedback row belongs to the authenticated user's client
      const { data: feedbackRow, error: fetchError } = await supabase
        .from('mood_board_feedback')
        .select('client_id')
        .eq('id', id)
        .single();

      if (fetchError || !feedbackRow) {
        return new Response(JSON.stringify({ error: 'Feedback not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the feedback belongs to the authenticated user's client
      const { data: userClient, error: userClientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userClientError || !userClient) {
        return new Response(JSON.stringify({ error: 'Client not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (feedbackRow.client_id !== userClient.id) {
        return new Response(JSON.stringify({ error: 'Forbidden: not your feedback' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // NOW update the feedback status
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

      // Extract ID from path: /functions/v1/mood-board-feedback/{id}/unlock
      const pathSegments = pathname.split('/').filter(Boolean);
      const idIndex = pathSegments.indexOf('mood-board-feedback');
      const id = idIndex >= 0 ? pathSegments[idIndex + 1] : null;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Invalid path format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
