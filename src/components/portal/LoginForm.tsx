import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-client';

type Step = 'email' | 'confirm' | 'sending' | 'sent' | 'error';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [errorMsg, setErrorMsg] = useState('');

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

  if (step === 'sent') {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Link gesendet!</h2>
        <p className="text-gray-600">
          Wir haben einen Zugangslink an <strong>{email}</strong> gesendet.
          Bitte prüfe dein Postfach.
        </p>
        <button
          onClick={reset}
          className="mt-4 hover:underline text-sm"
          style={{ color: 'var(--color-primary-light)' }}
        >
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  if (step === 'confirm' || step === 'sending') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          Zugangslink senden an:
        </p>
        <p className="text-center font-medium text-lg">{email}</p>
        {step === 'sending' ? (
          <div className="text-center py-2 text-sm text-gray-500">
            Wird gesendet…
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setStep('email')}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              Zurück
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 gradient-btn text-white rounded-lg font-medium"
            >
              Ja, Link senden
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@beispiel.de"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      {step === 'error' && (
        <p className="text-sm" style={{ color: 'oklch(0.7 0.15 25)' }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        className="w-full py-2.5 gradient-btn text-white rounded-lg font-medium"
      >
        Weiter
      </button>
    </form>
  );
}
