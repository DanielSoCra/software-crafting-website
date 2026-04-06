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
  status: 'draft' | 'published' | 'sent' | 'in_progress' | 'completed';
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

export type FormItem = AussageItem | EmpfehlungItem | FrageItem;

export interface AussageItem {
  type: 'aussage';
  text: string;
  escape?: string;
}

export interface EmpfehlungItem {
  type: 'empfehlung';
  value: string;
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

export interface Deliverable {
  id: string;
  client_id: string;
  type: 'analysis' | 'mood-board' | 'brand-guide' | 'website-preview' | 'proposal';
  status: 'published' | 'viewed';
  published_at: string;
  viewed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const DELIVERABLE_TYPES = [
  'analysis',
  'mood-board',
  'brand-guide',
  'website-preview',
  'proposal',
] as const;

export type DeliverableType = typeof DELIVERABLE_TYPES[number];

export const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  'analysis': 'Analyse',
  'mood-board': 'Mood Board',
  'brand-guide': 'Brand Guide',
  'website-preview': 'Website-Vorschau',
  'proposal': 'Angebot',
};

export interface AdminClient {
  id: string;
  company: string;
  slug: string;
  industry_key: string | null;
  contact_name: string | null;
}

export interface AdminDeliverable {
  client_id: string;
  type: DeliverableType;
  status: 'published' | 'viewed';
  published_at: string;
  viewed_at: string | null;
}

export interface AdminForm {
  client_id: string;
  id: string;
  status: 'draft' | 'published' | 'sent' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

// Mood Board Feedback Types
export type MoodBoardVote = 'like' | 'dislike' | 'favorite' | null;
export type MoodBoardFeedbackStatus = 'editing' | 'submitted';

export interface MoodBoardFeedback {
  id: string;
  deliverable_id: string;
  client_id: string;
  variant_name: string;
  vote: MoodBoardVote;
  is_favorite: boolean;
  comment_negative: string | null;
  comment_positive: string | null;
  comment_very_good: string | null;
  status: MoodBoardFeedbackStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MoodBoardFeedbackInput {
  deliverable_id: string;
  variant_name: string;
  vote?: MoodBoardVote;
  is_favorite?: boolean;
  comment_negative?: string | null;
  comment_positive?: string | null;
  comment_very_good?: string | null;
}
