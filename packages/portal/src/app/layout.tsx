import '@/styles/globals.css';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Toaster } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: {
    default: 'Kundenportal',
    template: '%s — Kundenportal',
  },
};

// Inline script to set theme before first paint (prevents flash)
const themeScript = `
(function(){
  var t = localStorage.getItem('portal-theme') || 'system';
  var d = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  if (d === 'dark') document.documentElement.classList.add('dark');
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="portal-page min-h-screen flex flex-col bg-background text-foreground"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <header className="border-b border-border/50 backdrop-blur-md bg-card/80">
          <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <a href="/portal" className="font-display text-lg font-bold tracking-tight">
              Software <span className="text-primary">Crafting</span>
              <span className="text-muted-foreground font-sans text-sm font-light ml-2">
                Kundenportal
              </span>
            </a>
            {user && (
              <div className="flex items-center gap-4 text-sm font-light">
                <a
                  href="/portal/settings"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Einstellungen
                </a>
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

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-border/50 mt-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between text-xs font-light text-muted-foreground">
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
        <Toaster />
      </body>
    </html>
  );
}
