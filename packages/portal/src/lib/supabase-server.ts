import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import type { Database } from './database.types';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}

export async function isUserAdmin(
  supabase: SupabaseServerClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();
  return !!data;
}

export async function resolveClient(
  supabase: SupabaseServerClient,
  userId: string,
  clientParam: string | null | undefined,
  isAdmin: boolean
) {
  let query = supabase.from('clients').select('id, slug, company');
  if (isAdmin && clientParam) {
    query = query.eq('slug', clientParam);
  } else {
    query = query.eq('user_id', userId);
  }
  return query.single();
}

/**
 * Page-level auth context.
 *
 * Middleware already rejects unauthenticated callers, so pages can assume
 * `user` is present. This helper centralizes the admin lookup + "current
 * user's client" lookup that nearly every page does.
 */
export interface AuthContext {
  supabase: SupabaseServerClient;
  user: User;
  isAdmin: boolean;
  /** Current user's own client row (null for admin accounts without a client). */
  myClient: { id: string } | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const isAdmin = await isUserAdmin(supabase, user.id);

  const { data: myClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  return { supabase, user, isAdmin, myClient: myClient ?? null };
}

/**
 * API-route auth guard. Returns the authenticated user on success or a 401
 * `NextResponse` that the handler should immediately return.
 *
 * Usage:
 *   const userOr401 = await requireAuth(req);
 *   if (userOr401 instanceof NextResponse) return userOr401;
 *   const { supabase, user } = userOr401;
 */
export async function requireAuth(
  _req: NextRequest,
): Promise<{ supabase: SupabaseServerClient; user: User } | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { supabase, user };
}
