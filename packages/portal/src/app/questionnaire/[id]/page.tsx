import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import { formSchemaValidator } from '@/lib/form-schema';
import QuestionnaireForm from '@/components/portal/QuestionnaireForm';
import type { Form } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuestionnairePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/portal/login');

  // Fetch form
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !form) {
    notFound();
  }

  // Validate form schema with Zod
  const schemaResult = formSchemaValidator.safeParse(form.schema);
  if (!schemaResult.success) {
    throw new Error('Ungültiges Formular-Schema. Bitte kontaktiere daniel@software-crafting.de.');
  }

  // For completed forms, load submitted answers
  let submittedAnswers: Record<string, string | string[]> = {};
  if (form.status === 'completed') {
    const { data: response } = await supabase
      .from('responses')
      .select('answers')
      .eq('form_id', form.id)
      .single();
    if (response) {
      submittedAnswers = response.answers as Record<string, string | string[]>;
    }
  }

  // Merge submitted answers for read-only view
  const formForClient: Form = {
    ...form,
    schema: schemaResult.data,
    draft_answers: form.status === 'completed' ? submittedAnswers : (form.draft_answers ?? {}),
  } as Form;

  return <QuestionnaireForm form={formForClient} />;
}
