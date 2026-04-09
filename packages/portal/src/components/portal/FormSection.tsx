'use client';

import { useRef, useState } from 'react';
import type { FormSection as FormSectionType, AussageItem, EmpfehlungItem, FrageItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';

// All color variants render identically in dark mode.
// Using a single default + gray differentiation.
const colorMap: Record<string, { border: string; bg: string; heading: string }> = {
  gray: { border: 'border-border', bg: 'bg-muted', heading: 'text-muted-foreground' },
};
const defaultColor = { border: 'border-primary', bg: 'bg-primary/5', heading: 'text-primary' };

interface Props {
  section: FormSectionType;
  answers: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  readOnly: boolean;
  errors?: Record<string, string>;
  onFileUpload?: (key: string, file: File) => void;
  uploadStates?: Record<string, 'idle' | 'uploading' | 'done' | 'error'>;
}

function renderRadioField(frage: FrageItem, value: string | string[], onChange: (key: string, value: string | string[]) => void, readOnly: boolean) {
  const selected = typeof value === 'string' ? value : '';
  return (
    <RadioGroup
      value={selected}
      onValueChange={(v) => onChange(frage.key, v)}
      disabled={readOnly}
      className="space-y-2"
    >
      {(frage.options ?? []).map((opt) => (
        <Field key={opt} orientation="horizontal">
          <RadioGroupItem value={opt} id={`${frage.key}-${opt}`} />
          <FieldLabel htmlFor={`${frage.key}-${opt}`} className="font-normal">{opt}</FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  );
}

function renderCheckboxField(frage: FrageItem, value: string | string[], onChange: (key: string, value: string | string[]) => void, readOnly: boolean) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="space-y-2">
      {(frage.options ?? []).map((opt) => (
        <Field key={opt} orientation="horizontal">
          <Checkbox
            id={`${frage.key}-${opt}`}
            checked={selected.includes(opt)}
            onCheckedChange={(checked) => {
              const next = checked
                ? [...selected, opt]
                : selected.filter((s) => s !== opt);
              onChange(frage.key, next);
            }}
            disabled={readOnly}
          />
          <FieldLabel htmlFor={`${frage.key}-${opt}`} className="font-normal">{opt}</FieldLabel>
        </Field>
      ))}
    </div>
  );
}

function FileUploadField({
  frage,
  value,
  readOnly,
  onFileUpload,
  uploadState,
}: {
  frage: FrageItem;
  value: string | string[];
  readOnly: boolean;
  onFileUpload?: (key: string, file: File) => void;
  uploadState?: 'idle' | 'uploading' | 'done' | 'error';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPath = typeof value === 'string' ? value : '';
  const fileName = currentPath ? currentPath.split('/').pop() : null;
  const [sizeError, setSizeError] = useState('');

  return (
    <div>
      {!readOnly && (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.ai,.eps,.zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !onFileUpload) return;
              if (file.size > 10 * 1024 * 1024) {
                setSizeError('Datei zu gross (max. 10 MB)');
                e.target.value = '';
                return;
              }
              setSizeError('');
              onFileUpload(frage.key, file);
              e.target.value = ''; // allow re-selecting same file
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploadState === 'uploading'}>
            Datei auswählen
          </Button>

          {uploadState === 'uploading' && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Wird hochgeladen...
            </span>
          )}
          {uploadState === 'error' && (
            <span className="text-sm text-destructive">Hochladen fehlgeschlagen</span>
          )}
          {sizeError && (
            <span className="text-sm text-destructive">{sizeError}</span>
          )}
        </div>
      )}

      {fileName && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {fileName}
        </div>
      )}
    </div>
  );
}

export default function FormSection({ section, answers, onChange, readOnly, errors, onFileUpload, uploadStates }: Props) {
  const colors = colorMap[section.color] ?? defaultColor;

  return (
    <Card className="rounded-xl mb-6">
      <CardContent className="p-6">
        <h3 className={`text-base font-semibold mb-4 pb-2 border-b-2 ${colors.border} ${colors.heading}`}>
          {section.title}
        </h3>

        <FieldGroup>
          {section.items.map((item, i) => {
            if (item.type === 'aussage') {
              const aussage = item as AussageItem;
              return (
                <div key={i} className={`${colors.bg} rounded-lg p-4 text-sm leading-relaxed`}>
                  <p>{aussage.text}</p>
                  {aussage.escape && (
                    <p className="mt-2 text-muted-foreground italic text-sm">{aussage.escape}</p>
                  )}
                </div>
              );
            }

            if (item.type === 'empfehlung') {
              const emp = item as EmpfehlungItem;
              return (
                <div key={i} className={`${colors.bg} rounded-lg p-4 text-sm leading-relaxed`}>
                  <p className="italic text-muted-foreground mb-2">{emp.value}</p>
                  <p>{emp.text}</p>
                  {emp.escape && (
                    <p className="mt-2 text-muted-foreground italic text-sm">{emp.escape}</p>
                  )}
                </div>
              );
            }

            const frage = item as FrageItem;
            const value = answers[frage.key] ?? '';
            const error = errors?.[frage.key];

            return (
              <Field key={frage.key} data-invalid={!!error || undefined}>
                <FieldLabel htmlFor={frage.key}>
                  {frage.label}
                  {frage.required && <span className="text-destructive ml-1">*</span>}
                </FieldLabel>

                {frage.field === 'file' ? (
                  <FileUploadField
                    frage={frage}
                    value={value}
                    readOnly={readOnly}
                    onFileUpload={onFileUpload}
                    uploadState={uploadStates?.[frage.key]}
                  />
                ) : frage.field === 'textarea' ? (
                  <Textarea
                    id={frage.key}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(frage.key, e.target.value)}
                    placeholder={frage.placeholder}
                    readOnly={readOnly}
                    rows={3}
                    className={readOnly ? 'bg-muted/50' : error ? 'border-destructive' : ''}
                  />
                ) : frage.field === 'select' ? (
                  <Select
                    value={typeof value === 'string' && value !== '' ? value : undefined}
                    onValueChange={(v) => onChange(frage.key, v)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id={frage.key} className={error ? 'border-destructive' : ''}>
                      <SelectValue placeholder={frage.placeholder ?? 'Bitte wählen...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(frage.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : frage.field === 'radio' ? (
                  renderRadioField(frage, value, onChange, readOnly)
                ) : frage.field === 'checkbox' ? (
                  renderCheckboxField(frage, value, onChange, readOnly)
                ) : (
                  <Input
                    id={frage.key}
                    type={frage.field === 'email' ? 'email' : frage.field === 'url' ? 'url' : 'text'}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(frage.key, e.target.value)}
                    placeholder={frage.placeholder}
                    readOnly={readOnly}
                    className={readOnly ? 'bg-muted/50' : error ? 'border-destructive' : ''}
                  />
                )}

                {error && <FieldError>{error}</FieldError>}
              </Field>
            );
          })}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
