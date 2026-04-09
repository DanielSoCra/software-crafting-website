'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';

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
        <FieldDescription>Anmeldung wird verarbeitet…</FieldDescription>
      </div>
    );
  }

  if (step === 'sent') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link gesendet!</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <FieldDescription>
                Wir haben einen Zugangslink an <strong>{email}</strong> gesendet.
                Bitte prüfe dein Postfach.
              </FieldDescription>
            </div>
            <Field>
              <Button variant="link" onClick={reset} className="w-full">
                Andere E-Mail verwenden
              </Button>
            </Field>
          </FieldGroup>
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
        <CardContent>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <FieldDescription>Zugangslink senden an:</FieldDescription>
              <p className="font-medium text-lg">{email}</p>
            </div>
            {step === 'sending' ? (
              <div className="text-center py-2">
                <FieldDescription>Wird gesendet…</FieldDescription>
              </div>
            ) : (
              <Field orientation="horizontal">
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
              </Field>
            )}
          </FieldGroup>
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
        <form onSubmit={handleEmailSubmit}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <FieldDescription>Gib deine E-Mail-Adresse ein, um einen Zugangslink zu erhalten.</FieldDescription>
            </div>
            <Field>
              <FieldLabel htmlFor="email">E-Mail-Adresse</FieldLabel>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
              />
            </Field>
            {step === 'error' && (
              <FieldError>{errorMsg}</FieldError>
            )}
            <Field>
              <Button type="submit" variant="gradient" className="w-full">
                Weiter
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
