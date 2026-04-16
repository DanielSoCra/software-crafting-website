import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ThemeSettings from '@/components/portal/ThemeSettings';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Einstellungen',
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-1">Dein Konto und die Darstellung des Portals.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Konto</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>E-Mail: <span className="text-foreground">{user.email}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Darstellung</h2>
            <ThemeSettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
