import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  // @supabase/ssr defaults to PKCE flow — correct for SSR.
  // Token exchange happens server-side via /auth/confirm route handler.
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
