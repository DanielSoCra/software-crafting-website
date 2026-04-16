import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST call getUser, not getSession
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === '/login' || pathname === '/datenschutz';
  const isApiRoute = pathname.startsWith('/api/');

  // Build external URL from proxy headers (not internal server address)
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'software-crafting.de';
  const origin = `${proto}://${host}`;

  // Unauthenticated callers: JSON 401 for API routes, redirect for pages.
  // Each API route still performs its own auth check — middleware is the safety net.
  if (!user && !isPublicRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/portal/login', origin));
  }

  // Redirect authenticated users away from login (but not during code exchange or logout)
  if (user && pathname === '/login' && !request.nextUrl.searchParams.has('logout') && !request.nextUrl.searchParams.has('code')) {
    return NextResponse.redirect(new URL('/portal/dashboard', origin));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude only Next.js internals, static assets, and the auth callback
    // (cookie confirmation flow). API routes are guarded by this middleware.
    '/((?!_next/static|_next/image|favicon.ico|auth/).*)',
  ],
};
