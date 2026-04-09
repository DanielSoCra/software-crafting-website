import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-client';
import FormSection from './FormSection';
import type { Form, FormSchema, FrageItem } from '../../lib/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  form: Form;
}

export default function QuestionnaireForm({ form }: Props) {
  const schema = form.schema as FormSchema;
  const isCompleted = form.status === 'completed';
  const isReadOnly = form.status === 'completed' || form.status === 'published';
  const totalSteps = schema.sections.length + 1; // +1 for built-in final step

  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    form.draft_answers ?? {}
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(form.status);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isCompleted);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadStates, setUploadStates] = useState<Record<string, 'idle' | 'uploading' | 'done' | 'error'>>({});
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const supabase = getSupabaseBrowserClient();

  // --- Draft persistence ---

  const saveDraft = useCallback(async (draft: Record<string, string | string[]>) => {
    if (isReadOnly) return;
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

    if (currentStatus === 'sent') setCurrentStatus('in_progress');
    setSaveStatus('saved');
  }, [form.id, currentStatus, isReadOnly, supabase]);

  function handleChange(key: string, value: string | string[]) {
    if (isReadOnly) return;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setSaveStatus('unsaved');

    // Clear error for this field on change
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveDraft(updated), 2000);
  }

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  // --- File upload ---

  async function handleFileUpload(key: string, file: File) {
    const path = `${form.id}/${key}/${file.name}`;
    setUploadStates(prev => ({ ...prev, [key]: 'uploading' }));

    const { error } = await supabase.storage
      .from('form-uploads')
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadStates(prev => ({ ...prev, [key]: 'error' }));
      return;
    }

    setUploadStates(prev => ({ ...prev, [key]: 'done' }));
    handleChange(key, path);
  }

  async function handleMultiFileUpload(files: FileList) {
    const newPaths: string[] = [];

    for (const file of Array.from(files)) {
      const path = `${form.id}/_attachments/${file.name}`;
      const uploadKey = `_attachment_${file.name}`;
      setUploadStates(prev => ({ ...prev, [uploadKey]: 'uploading' }));

      const { error } = await supabase.storage
        .from('form-uploads')
        .upload(path, file, { upsert: true });

      if (error) {
        setUploadStates(prev => ({ ...prev, [uploadKey]: 'error' }));
        continue;
      }

      setUploadStates(prev => ({ ...prev, [uploadKey]: 'done' }));
      newPaths.push(path);
    }

    if (newPaths.length === 0) return;

    // Functional updater avoids stale closure with concurrent textarea edits
    let updatedAnswers: Record<string, string | string[]> | null = null;
    setAnswers(prev => {
      const existing = Array.isArray(prev['_attachments']) ? prev['_attachments'] : [];
      updatedAnswers = { ...prev, '_attachments': [...existing, ...newPaths] };
      return updatedAnswers;
    });
    setSaveStatus('unsaved');

    // Save immediately with the computed value (ref may lag one render)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (updatedAnswers) {
      autosaveTimer.current = setTimeout(() => saveDraft(updatedAnswers!), 2000);
    }
  }

  // --- Step validation ---

  function validateStep(stepIndex: number): boolean {
    const section = schema.sections[stepIndex];
    if (!section) return true; // final step — all optional

    const newErrors: Record<string, string> = {};
    for (const item of section.items) {
      if (item.type !== 'frage' || !item.required) continue;
      const frage = item as FrageItem;
      const val = answers[frage.key];
      if (frage.field === 'file') {
        if (!val || (typeof val === 'string' && !val.trim())) {
          newErrors[frage.key] = 'Bitte lade eine Datei hoch.';
        }
      } else if (Array.isArray(val)) {
        if (val.length === 0) newErrors[frage.key] = 'Bitte beantworte diese Frage.';
      } else if (!val?.trim()) {
        newErrors[frage.key] = 'Bitte beantworte diese Frage.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // --- Navigation ---

  async function goNext() {
    if (!validateStep(currentStep)) return;

    // Flush pending autosave immediately
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    await saveDraft(answers);

    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }

  function goBack() {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }

  // --- Submit ---

  async function handleSubmit() {
    if (isReadOnly) return;

    // Validate all sections
    for (let i = 0; i < schema.sections.length; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    setSubmitting(true);

    // Flush autosave
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    const { error: respError } = await supabase.from('responses').insert({
      form_id: form.id,
      client_id: form.client_id,
      answers,
    });

    if (respError) {
      setErrors({ _submit: 'Fehler beim Absenden. Bitte versuche es erneut.' });
      setSubmitting(false);
      return;
    }

    const { error: statusError } = await supabase
      .from('forms')
      .update({ status: 'completed' })
      .eq('id', form.id);

    if (statusError) {
      console.error('Status update failed:', statusError);
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  // --- Render ---

  if (submitted) {
    const sie = schema.formality === 'sie';
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">&#10003;</div>
        <h2 className="text-xl font-semibold mb-2">Vielen Dank!</h2>
        <p className="text-muted-foreground">
          {sie
            ? 'Ihre Antworten wurden gespeichert. Daniel meldet sich bei Ihnen mit dem nächsten Schritt.'
            : 'Deine Antworten wurden gespeichert. Daniel meldet sich bei dir mit dem nächsten Schritt.'}
        </p>
      </div>
    );
  }

  const isFinalStep = currentStep === schema.sections.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{form.title ?? 'Kurze Rückfragen'}</h2>
        <p className="text-muted-foreground mt-1">{schema.intro}</p>
      </div>

      {/* Progress */}
      {!isReadOnly && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Schritt {currentStep + 1} von {totalSteps}
            </span>
            {saveStatus === 'saving' && <span className="text-xs text-muted-foreground">Wird gespeichert...</span>}
            {saveStatus === 'saved' && <span className="text-xs text-muted-foreground">Gespeichert</span>}
            {saveStatus === 'unsaved' && <span className="text-xs text-muted-foreground">Ungespeichert</span>}
            {saveStatus === 'error' && <span className="text-xs text-destructive">Speichern fehlgeschlagen</span>}
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}

      {/* Current section or final step */}
      {isFinalStep ? (
        <FinalStep
          formality={schema.formality}
          answers={answers}
          onChange={handleChange}
          onMultiUpload={handleMultiFileUpload}
          uploadStates={uploadStates}
          readOnly={isReadOnly}
        />
      ) : (
        <FormSection
          section={schema.sections[currentStep]}
          answers={answers}
          onChange={handleChange}
          readOnly={isReadOnly}
          errors={errors}
          onFileUpload={handleFileUpload}
          uploadStates={uploadStates}
        />
      )}

      {/* Submit error */}
      {errors._submit && (
        <p className="text-sm text-destructive mb-4">{errors._submit}</p>
      )}

      {/* Navigation */}
      {!isReadOnly && (
        <div className="flex items-center justify-between mt-6">
          {currentStep > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={goBack} className="gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </Button>
          ) : (
            <div />
          )}

          {isFinalStep ? (
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Wird gesendet...' : 'Antworten absenden'}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} className="gap-1.5">
              Weiter
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      )}

      {/* Hint */}
      {!isReadOnly && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          {schema.formality === 'sie'
            ? 'Sie können jederzeit zurückkommen und Ihre Antworten ändern, solange der Fragebogen offen ist.'
            : 'Du kannst jederzeit zurückkommen und deine Antworten ändern, solange der Fragebogen offen ist.'}
        </p>
      )}
    </div>
  );
}

// --- Built-in final step ---

function FinalStep({
  formality,
  answers,
  onChange,
  onMultiUpload,
  uploadStates,
  readOnly,
}: {
  formality: 'du' | 'sie';
  answers: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  onMultiUpload: (files: FileList) => void;
  uploadStates: Record<string, 'idle' | 'uploading' | 'done' | 'error'>;
  readOnly: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sie = formality === 'sie';
  const attachments = Array.isArray(answers['_attachments']) ? answers['_attachments'] : [];
  const notesValue = typeof answers['_notes'] === 'string' ? answers['_notes'] : '';

  const hasActiveUpload = Object.entries(uploadStates).some(
    ([key, state]) => key.startsWith('_attachment_') && state === 'uploading'
  );

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
      <h3 className="text-base font-semibold mb-4 pb-2 border-b-2 border-primary text-primary">
        Noch etwas?
      </h3>

      {/* Free text */}
      <div className="mb-6">
        <Label className="block mb-1">
          {sie
            ? 'Gibt es sonst noch etwas, das Sie uns mitteilen möchten?'
            : 'Gibt es sonst noch etwas, das du uns mitteilen möchtest?'}
        </Label>
        <Textarea
          value={notesValue}
          onChange={(e) => onChange('_notes', e.target.value)}
          placeholder={sie ? 'Ihre Nachricht (optional)...' : 'Deine Nachricht (optional)...'}
          readOnly={readOnly}
          rows={4}
          className={readOnly ? 'bg-muted/50' : ''}
        />
      </div>

      {/* Multi-file upload */}
      <div>
        <Label className="block mb-1">
          {sie
            ? 'Möchten Sie uns Dateien schicken? (z.B. Logo, Fotos, Dokumente)'
            : 'Möchtest du uns Dateien schicken? (z.B. Logo, Fotos, Dokumente)'}
        </Label>

        {!readOnly && (
          <div className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.ai,.eps,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  // Filter out oversized files
                  const valid = Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024);
                  if (valid.length > 0) {
                    const dt = new DataTransfer();
                    valid.forEach(f => dt.items.add(f));
                    onMultiUpload(dt.files);
                  }
                  e.target.value = '';
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={hasActiveUpload}
            >
              {hasActiveUpload ? 'Wird hochgeladen...' : 'Dateien auswählen'}
            </Button>
          </div>
        )}

        {/* Uploaded files list */}
        {attachments.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {attachments.map((path) => {
              const name = typeof path === 'string' ? path.split('/').pop() : path;
              const uploadKey = `_attachment_${name}`;
              const state = uploadStates[uploadKey];
              return (
                <li key={path} className="flex items-center gap-2 text-sm text-muted-foreground">
                  {state === 'uploading' ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                    </span>
                  ) : (
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {name}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </CardContent>
    </Card>
  );
}
