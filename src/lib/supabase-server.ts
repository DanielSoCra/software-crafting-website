import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('cookie') ?? '');
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptionsWithName }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name: name.trim(), value: rest.join('=') };
  });
}
