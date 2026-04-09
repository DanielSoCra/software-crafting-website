import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/portal/LoginForm';

interface Props {
  searchParams: Promise<{
    logout?: string;
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Handle logout
  if (params.logout === 'true') {
    await supabase.auth.signOut();
    redirect('/login');
  }

  // Handle PKCE code exchange (if Supabase ever sends ?code=)
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (!error) {
      redirect('/dashboard');
    }
    // Fall through to show login with error
  }

  // Determine error state from query params (Supabase sends these on failure)
  const hasError = !!params.error;
  const errorDescription = params.error_description?.replace(/\+/g, ' ');

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-display font-bold mb-2">Dein Projektbereich</h1>
        <p className="text-muted-foreground text-sm">
          Hier siehst du, wie es mit deiner Website vorangeht.
        </p>
      </div>
      {hasError && (
        <div
          className="rounded-lg p-4 mb-6 text-sm"
          style={{
            backgroundColor: 'oklch(0.25 0.05 25)',
            border: '1px solid oklch(0.35 0.08 25)',
            color: 'oklch(0.75 0.12 25)',
          }}
        >
          {errorDescription === 'Email link is invalid or has expired'
            ? 'Der Link ist leider abgelaufen. Fordere einfach unten einen neuen an.'
            : errorDescription || 'Etwas hat nicht geklappt. Bitte versuche es nochmal.'}
        </div>
      )}
      <LoginForm />
    </div>
  );
}
