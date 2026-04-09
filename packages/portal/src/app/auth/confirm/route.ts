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

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      // Successful verification — redirect to dashboard (or next param)
      const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      return NextResponse.redirect(new URL(`/portal${safePath}`, origin));
    }
  }

  // Verification failed — redirect to login with error
  return NextResponse.redirect(
    new URL('/portal/login?error=otp_error&error_description=Der+Link+ist+leider+abgelaufen.+Fordere+einfach+unten+einen+neuen+an.', origin)
  );
}
