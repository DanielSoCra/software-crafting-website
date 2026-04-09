import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/portal/LoginForm';

interface Props {
  searchParams: Promise<{ logout?: string; code?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Handle logout
  if (params.logout === 'true') {
    await supabase.auth.signOut();
    redirect('/portal/login');
  }

  // Handle PKCE code exchange
  let exchangeFailed = false;
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (!error) {
      // Validate redirect target — only allow /portal/* paths
      const next = params.next ?? '';
      const safeNext = next.startsWith('/portal/') ? next : '/portal/dashboard';
      redirect(safeNext);
    }
    exchangeFailed = true;
  }

  // Note: middleware already redirects logged-in users to dashboard
  // This is a fallback check

  return (
    <div className="max-w-md mx-auto mt-16">
      {exchangeFailed && (
        <div
          className="rounded-lg p-4 mb-6 text-sm"
          style={{
            backgroundColor: 'oklch(0.25 0.05 25)',
            border: '1px solid oklch(0.35 0.08 25)',
            color: 'oklch(0.75 0.12 25)',
          }}
        >
          Der Zugangslink ist abgelaufen oder ungültig. Bitte fordere einen neuen an.
        </div>
      )}
      <LoginForm />
    </div>
  );
}
