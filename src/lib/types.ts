export interface Client {
  id: string;
  user_id: string | null;
  company: string;
  contact_name: string | null;
  slug: string;
  email: string | null;
  phone: string | null;
  formality: 'du' | 'sie';
  industry_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Form {
  id: string;
  client_id: string;
  title: string | null;
  schema: FormSchema;
  draft_answers: Record<string, string | string[]>;
  status: 'draft' | 'sent' | 'in_progress' | 'completed';
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Response {
  id: string;
  form_id: string;
  client_id: string;
  answers: Record<string, string | string[]>;
  submitted_at: string;
}

export interface FormSchema {
  version: number;
  formality: 'du' | 'sie';
  intro: string;
  sections: FormSection[];
}

export interface FormSection {
  key: string;
  title: string;
  color: 'teal' | 'indigo' | 'purple' | 'gray' | 'pink';
  items: FormItem[];
}

export type FormItem = AussageItem | FrageItem;

export interface AussageItem {
  type: 'aussage';
  text: string;
  escape?: string;
}

export interface FrageItem {
  type: 'frage';
  key: string;
  label: string;
  field: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'email' | 'url' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
}
