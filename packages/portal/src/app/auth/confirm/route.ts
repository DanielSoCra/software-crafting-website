import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  // Build redirect URL using forwarded headers (behind nginx proxy)
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'software-crafting.de';
  const origin = `${proto}://${host}`;

  console.log('[auth/confirm] token_hash:', token_hash?.slice(0, 20) + '...', 'type:', type);

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    console.log('[auth/confirm] verifyOtp result:', error ? `ERROR: ${error.message}` : 'SUCCESS', 'session:', !!data?.session);

    if (!error) {
      // Successful verification — redirect to dashboard (or next param)
      const safePath = next.startsWith('/') ? next : '/dashboard';
      return NextResponse.redirect(new URL(`/portal${safePath}`, origin));
    }
  }

  console.log('[auth/confirm] FAILED — redirecting to login');
  // Verification failed — redirect to login with error
  return NextResponse.redirect(
    new URL('/portal/login?error=otp_error&error_description=Der+Zugangslink+ist+abgelaufen+oder+ungültig.', origin)
  );
}
