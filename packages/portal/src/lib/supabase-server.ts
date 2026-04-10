import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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
