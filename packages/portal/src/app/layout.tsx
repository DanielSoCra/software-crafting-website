import '@/styles/globals.css';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: {
    default: 'Kundenportal',
    template: '%s — Kundenportal',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="de" className="dark">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className="portal-page min-h-screen flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <header className="border-b border-border/50 bg-bg-secondary/50 backdrop-blur-md">
          <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/portal" className="font-display text-lg font-bold tracking-tight">
              Software <span className="text-primary">Crafting</span>
              <span className="text-muted-foreground font-sans text-sm font-light ml-2">
                Kundenportal
              </span>
            </a>
            {user && (
              <div className="flex items-center gap-4 text-sm font-light">
                <span className="text-muted-foreground">{user.email}</span>
                <a
                  href="/portal/login?logout=true"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Abmelden
                </a>
              </div>
            )}
          </nav>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-border/50 mt-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs font-light text-muted-foreground">
            <p>Software Crafting &middot; Inh. Daniel Eberl</p>
            <div className="flex gap-4">
              <a href="/datenschutz" className="hover:text-foreground transition-colors">
                Datenschutz
              </a>
              <a href="/impressum" className="hover:text-foreground transition-colors">
                Impressum
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
