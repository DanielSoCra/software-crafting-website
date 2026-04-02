import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/login`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }

    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Link gesendet!</h2>
        <p className="text-gray-600">
          Wir haben dir einen Zugangslink an <strong>{email}</strong> gesendet.
          Bitte prüfe dein Postfach.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-teal-600 hover:underline text-sm"
        >
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      {status === 'error' && (
        <p className="text-red-600 text-sm">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
      >
        {status === 'sending' ? 'Wird gesendet...' : 'Zugangslink anfordern'}
      </button>
    </form>
  );
}
