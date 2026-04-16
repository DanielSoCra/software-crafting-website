import { describe, it, expect } from 'vitest';
import { formSchemaValidator } from '@/lib/form-schema';

/**
 * formSchemaValidator guards every questionnaire the portal renders. Invalid
 * schemas come from Supabase rows that were edited by hand or by a skill that
 * produced malformed JSON; we need the validator to reject anything the UI
 * cannot render safely.
 */

const minimalValidSchema = {
  version: 1 as const,
  formality: 'du' as const,
  intro: 'Kurze Fragen',
  sections: [
    {
      key: 'about',
      title: 'Über dich',
      color: 'teal' as const,
      items: [
        {
          type: 'frage' as const,
          key: 'name',
          label: 'Wie heißt du?',
          field: 'text' as const,
          required: true,
        },
      ],
    },
  ],
};

describe('formSchemaValidator', () => {
  it('accepts a minimal valid schema', () => {
    expect(formSchemaValidator.safeParse(minimalValidSchema).success).toBe(true);
  });

  it('accepts all supported field types', () => {
    const schema = {
      ...minimalValidSchema,
      sections: [
        {
          ...minimalValidSchema.sections[0],
          items: [
            { type: 'frage', key: 't', label: 'Text', field: 'text', required: false },
            { type: 'frage', key: 'a', label: 'Area', field: 'textarea', required: false },
            { type: 'frage', key: 'e', label: 'Email', field: 'email', required: false },
            { type: 'frage', key: 'u', label: 'URL', field: 'url', required: false },
            { type: 'frage', key: 'f', label: 'File', field: 'file', required: false },
            { type: 'frage', key: 's', label: 'Select', field: 'select', required: false, options: ['a', 'b'] },
            { type: 'frage', key: 'r', label: 'Radio', field: 'radio', required: false, options: ['a', 'b'] },
            { type: 'frage', key: 'c', label: 'Check', field: 'checkbox', required: false, options: ['a'] },
          ],
        },
      ],
    };
    expect(formSchemaValidator.safeParse(schema).success).toBe(true);
  });

  it('accepts aussage and empfehlung items mixed with frage items', () => {
    const schema = {
      ...minimalValidSchema,
      sections: [
        {
          ...minimalValidSchema.sections[0],
          items: [
            { type: 'aussage', text: 'Hinweis' },
            { type: 'empfehlung', value: 'pro', text: 'Empfohlen' },
            { type: 'frage', key: 'name', label: 'Name', field: 'text', required: true },
          ],
        },
      ],
    };
    expect(formSchemaValidator.safeParse(schema).success).toBe(true);
  });

  it('rejects version other than 1', () => {
    expect(formSchemaValidator.safeParse({ ...minimalValidSchema, version: 2 }).success).toBe(false);
  });

  it('rejects unknown formality', () => {
    expect(formSchemaValidator.safeParse({ ...minimalValidSchema, formality: 'casual' }).success).toBe(false);
  });

  it('rejects unknown field type', () => {
    const schema = {
      ...minimalValidSchema,
      sections: [
        {
          ...minimalValidSchema.sections[0],
          items: [{ type: 'frage', key: 'x', label: 'x', field: 'number', required: false }],
        },
      ],
    };
    expect(formSchemaValidator.safeParse(schema).success).toBe(false);
  });

  it('rejects select without options', () => {
    const schema = {
      ...minimalValidSchema,
      sections: [
        {
          ...minimalValidSchema.sections[0],
          items: [{ type: 'frage', key: 's', label: 'Select', field: 'select', required: true }],
        },
      ],
    };
    expect(formSchemaValidator.safeParse(schema).success).toBe(false);
  });

  it('rejects radio with empty options array', () => {
    const schema = {
      ...minimalValidSchema,
      sections: [
        {
          ...minimalValidSchema.sections[0],
          items: [{ type: 'frage', key: 'r', label: 'Radio', field: 'radio', required: true, options: [] }],
        },
      ],
    };
    expect(formSchemaValidator.safeParse(schema).success).toBe(false);
  });

  it('rejects unknown section color', () => {
    const schema = {
      ...minimalValidSchema,
      sections: [{ ...minimalValidSchema.sections[0], color: 'red' }],
    };
    expect(formSchemaValidator.safeParse(schema).success).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(formSchemaValidator.safeParse(null).success).toBe(false);
    expect(formSchemaValidator.safeParse('not an object').success).toBe(false);
    expect(formSchemaValidator.safeParse([]).success).toBe(false);
  });

  it('rejects missing intro', () => {
    const { intro: _intro, ...without } = minimalValidSchema;
    expect(formSchemaValidator.safeParse(without).success).toBe(false);
  });
});
