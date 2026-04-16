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

  // Handle implicit-flow callback (#access_token in hash).
  // Used by: admin-generated magic links, /invite skill, old email links.
  // User-requested links use PKCE via /auth/confirm route handler.
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
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
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
      setStep('error');
      setErrorMsg('Etwas ist schiefgelaufen. Bitte versuche es in ein paar Minuten nochmal.');
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
          <CardTitle>E-Mail ist unterwegs!</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">&#9993;</div>
              <FieldDescription>
                Wir haben eine E-Mail an <strong>{email}</strong> geschickt.
              </FieldDescription>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>So geht&apos;s weiter:</strong></p>
                <p>1. Schau in dein E-Mail-Postfach</p>
                <p>2. Klicke auf den Link in der E-Mail</p>
                <p>3. Du wirst automatisch angemeldet</p>
              </div>
              <FieldDescription className="text-xs">
                Keine E-Mail erhalten? Schau auch im Spam-Ordner nach.
              </FieldDescription>
            </div>
            <Field>
              <Button variant="link" onClick={reset} className="w-full">
                Andere E-Mail-Adresse verwenden
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
          <CardTitle>Stimmt die Adresse?</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <FieldDescription>Wir schicken den Anmelde-Link an:</FieldDescription>
              <p className="font-medium text-lg">{email}</p>
            </div>
            {step === 'sending' ? (
              <div className="text-center py-2">
                <FieldDescription>Wird gesendet&hellip;</FieldDescription>
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
                  variant="default"
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
        <CardTitle>Willkommen!</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSubmit}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-3 text-center">
              <FieldDescription>
                Hier kannst du den Fortschritt deines Website-Projekts verfolgen,
                Fragen beantworten und Entwürfe ansehen.
              </FieldDescription>
              <FieldDescription className="text-xs text-muted-foreground">
                Kein Passwort nötig — du bekommst einen persönlichen Link per E-Mail.
              </FieldDescription>
            </div>
            <Field>
              <FieldLabel htmlFor="email">Deine E-Mail-Adresse</FieldLabel>
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
              <Button type="submit" variant="default" className="w-full">
                Anmelde-Link anfordern
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
