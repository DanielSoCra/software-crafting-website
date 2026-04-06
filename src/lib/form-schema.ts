import { z } from 'zod';

const aussageItemSchema = z.object({
  type: z.literal('aussage'),
  text: z.string(),
  escape: z.string().optional(),
});

const empfehlungItemSchema = z.object({
  type: z.literal('empfehlung'),
  value: z.string(),
  text: z.string(),
  escape: z.string().optional(),
});

const frageItemSchema = z.object({
  type: z.literal('frage'),
  key: z.string(),
  label: z.string(),
  field: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'email', 'url', 'file']),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
}).refine(
  (item) => {
    if (['select', 'radio', 'checkbox'].includes(item.field)) {
      return item.options && item.options.length > 0;
    }
    return true;
  },
  { message: 'options required for select/radio/checkbox fields' }
);

const formItemSchema = z.union([aussageItemSchema, empfehlungItemSchema, frageItemSchema]);

const formSectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  color: z.enum(['teal', 'indigo', 'purple', 'gray', 'pink']),
  items: z.array(formItemSchema),
});

export const formSchemaValidator = z.object({
  version: z.literal(1),
  formality: z.enum(['du', 'sie']),
  intro: z.string(),
  sections: z.array(formSectionSchema),
});

export type ValidatedFormSchema = z.infer<typeof formSchemaValidator>;
