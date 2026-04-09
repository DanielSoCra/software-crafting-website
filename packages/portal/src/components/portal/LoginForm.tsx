'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Step = 'email' | 'confirm' | 'sending' | 'sent' | 'error' | 'callback';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle implicit-flow magic link callback (#access_token in hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    setStep('callback');

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      setStep('error');
      setErrorMsg('Ungültiger Zugangslink.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }: { error: Error | null }) => {
      if (!error) {
        window.history.replaceState(null, '', window.location.pathname);
        window.location.href = '/portal/dashboard';
      } else {
        setStep('error');
        setErrorMsg('Anmeldung fehlgeschlagen. Bitte fordere einen neuen Link an.');
      }
    });
  }, []);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep('confirm');
  }

  async function handleConfirm() {
    setStep('sending');
    setErrorMsg('');

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/login`,
        shouldCreateUser: false,
      },
    });

    // Always show "sent" — never reveal whether the account exists
    if (error?.message === 'Signups not allowed for otp') {
      setStep('sent');
      return;
    }

    if (error) {
      // Only surface genuine errors (rate limit, network, etc.)
      setStep('error');
      setErrorMsg('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
      return;
    }

    setStep('sent');
  }

  function reset() {
    setEmail('');
    setStep('email');
    setErrorMsg('');
  }

  if (step === 'callback') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Anmeldung wird verarbeitet…</p>
      </div>
    );
  }

  if (step === 'sent') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link gesendet!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Wir haben einen Zugangslink an <strong>{email}</strong> gesendet.
            Bitte prüfe dein Postfach.
          </p>
          <Button variant="link" onClick={reset} className="mt-4">
            Andere E-Mail verwenden
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirm' || step === 'sending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kundenportal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Zugangslink senden an:
          </p>
          <p className="text-center font-medium text-lg">{email}</p>
          {step === 'sending' ? (
            <div className="text-center py-2 text-sm text-muted-foreground">
              Wird gesendet…
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('email')}
              >
                Zurück
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleConfirm}
              >
                Ja, Link senden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kundenportal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@beispiel.de"
            />
          </div>
          {step === 'error' && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
          <Button type="submit" variant="gradient" className="w-full">
            Weiter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
