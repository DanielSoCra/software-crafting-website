import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import type { Database } from './database.types';

let adminClient: SupabaseClient<Database, 'public'> | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return adminClient;
}

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getClientForUser(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error || !client) return null;
  return client;
}
