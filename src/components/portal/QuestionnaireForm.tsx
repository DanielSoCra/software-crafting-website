import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-client';
import FormSection from './FormSection';
import type { Form, FormSchema, FrageItem } from '../../lib/types';

interface Props {
  form: Form;
}

export default function QuestionnaireForm({ form }: Props) {
  const schema = form.schema as FormSchema;
  const isCompleted = form.status === 'completed';
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    form.draft_answers ?? {}
  );
  const [currentStatus, setCurrentStatus] = useState(form.status);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isCompleted);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = getSupabaseBrowserClient();

  const saveDraft = useCallback(async (draft: Record<string, string | string[]>) => {
    if (isCompleted) return;
    setSaveStatus('saving');

    const newStatus = currentStatus === 'sent' ? 'in_progress' : currentStatus;
    const { error } = await supabase
      .from('forms')
      .update({ draft_answers: draft, status: newStatus })
      .eq('id', form.id);

    if (error) {
      setSaveStatus('error');
      return;
    }

    if (currentStatus === 'sent') {
      setCurrentStatus('in_progress');
    }
    setSaveStatus('saved');
  }, [form.id, currentStatus, isCompleted, supabase]);

  function handleChange(key: string, value: string | string[]) {
    if (isCompleted) return;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setSaveStatus('unsaved');

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveDraft(updated), 2000);
  }

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCompleted) return;

    const requiredKeys = schema.sections
      .flatMap((s) => s.items)
      .filter((item): item is FrageItem => item.type === 'frage' && item.required)
      .map((f) => f.key);

    const missing = requiredKeys.filter((key) => {
      const val = answers[key];
      if (Array.isArray(val)) return val.length === 0;
      return !val?.trim();
    });

    if (missing.length > 0) {
      alert(`Bitte fülle alle Pflichtfelder aus (${missing.length} fehlen).`);
      return;
    }

    setSubmitting(true);

    // Insert response
    const { error: respError } = await supabase.from('responses').insert({
      form_id: form.id,
      client_id: form.client_id,
      answers,
    });

    if (respError) {
      alert('Fehler beim Absenden. Bitte versuche es erneut.');
      setSubmitting(false);
      return;
    }

    // Update form status to completed
    const { error: statusError } = await supabase
      .from('forms')
      .update({ status: 'completed' })
      .eq('id', form.id);

    if (statusError) {
      // Response was saved but status update failed — not ideal but data is safe
      console.error('Status update failed:', statusError);
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Vielen Dank!</h2>
        <p className="text-gray-600">
          Deine Antworten wurden gespeichert. Daniel meldet sich bei dir mit dem nächsten Schritt.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{form.title ?? 'Kurze Rückfragen'}</h2>
        <p className="text-gray-600 mt-1">{schema.intro}</p>
      </div>

      {!isCompleted && (
        <div className="text-xs text-right mb-4">
          {saveStatus === 'saving' && <span className="text-gray-400">Wird gespeichert...</span>}
          {saveStatus === 'saved' && <span className="text-gray-400">Alle Änderungen gespeichert</span>}
          {saveStatus === 'unsaved' && <span className="text-amber-500">Ungespeicherte Änderungen</span>}
          {saveStatus === 'error' && <span className="text-red-500">Speichern fehlgeschlagen — wird erneut versucht</span>}
        </div>
      )}

      {schema.sections.map((section) => (
        <FormSection
          key={section.key}
          section={section}
          answers={answers}
          onChange={handleChange}
          readOnly={isCompleted}
        />
      ))}

      {!isCompleted && (
        <>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Wird gesendet...' : 'Antworten absenden'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            Du kannst jederzeit zurückkommen und deine Antworten ändern, solange der Fragebogen offen ist.
          </p>
        </>
      )}
    </form>
  );
}
