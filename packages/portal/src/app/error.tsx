'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Portal Error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Etwas ist schiefgelaufen</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut
            oder kontaktiere uns unter{' '}
            <a href="mailto:daniel@software-crafting.de" className="text-primary hover:underline">
              daniel@software-crafting.de
            </a>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.href = '/portal/dashboard'}>
              Zum Dashboard
            </Button>
            <Button onClick={reset}>
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
