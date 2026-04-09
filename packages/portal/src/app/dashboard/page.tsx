import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/portal/Dashboard';
import AdminDashboard from '@/components/portal/AdminDashboard';
import type { Deliverable, AdminClient, AdminDeliverable, AdminForm, Form } from '@/lib/types';
import type { PlanStep } from '@/components/portal/Dashboard';

interface Props {
  searchParams: Promise<{ client?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/portal/login');

  // Check if user is admin
  const { data: adminRole, error: adminRoleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  if (adminRoleError && adminRoleError.code !== 'PGRST116') {
    throw new Error('Ein Fehler ist aufgetreten.');
  }
  const isAdmin = !!adminRole;
  const clientParam = params.client;

  // Admin without ?client= → admin overview
  if (isAdmin && !clientParam) {
    const [clientsRes, deliverablesRes, formsRes] = await Promise.all([
      supabase.from('clients').select('id, company, slug, industry_key, contact_name').order('company'),
      supabase.from('deliverables').select('client_id, type, status, published_at, viewed_at'),
      supabase.from('forms').select('client_id, id, status, created_at, updated_at').order('created_at', { ascending: false }).order('id', { ascending: false }),
    ]);

    if (clientsRes.error || deliverablesRes.error || formsRes.error) {
      throw new Error('Ein Fehler ist aufgetreten.');
    }

    const adminClients = (clientsRes.data ?? []) as AdminClient[];
    const adminDeliverables = (deliverablesRes.data ?? []) as AdminDeliverable[];

    // Deduplicate forms: keep latest per client_id
    const formMap = new Map<string, AdminForm>();
    for (const form of (formsRes.data ?? []) as AdminForm[]) {
      if (!formMap.has(form.client_id)) {
        formMap.set(form.client_id, form);
      }
    }
    const adminForms = Array.from(formMap.values());

    return (
      <AdminDashboard
        clients={adminClients}
        deliverables={adminDeliverables}
        forms={adminForms}
      />
    );
  }

  // Client view (regular user OR admin with ?client=slug)
  let clientQuery = supabase.from('clients').select('id, company, slug, metadata');
  let clientSlug: string | undefined;
  if (isAdmin && clientParam) {
    clientQuery = clientQuery.eq('slug', clientParam);
    clientSlug = clientParam;
  } else {
    clientQuery = clientQuery.eq('user_id', user.id);
  }
  const { data: clientData, error: clientError } = await clientQuery.single();

  if (clientError && clientError.code !== 'PGRST116') {
    throw new Error('Ein Fehler ist aufgetreten.');
  }

  if (!clientData) {
    // Admin with bad slug → back to overview; non-admin → login
    redirect(isAdmin ? '/portal/dashboard' : '/portal/login');
  }

  const client = clientData as { id: string; company: string; slug: string; metadata: { project_plan?: PlanStep[] } };

  const [delRes, formRes] = await Promise.all([
    supabase.from('deliverables').select('*').eq('client_id', client.id),
    supabase.from('forms').select('id, status').eq('client_id', client.id).order('created_at', { ascending: false }).limit(1),
  ]);

  if (delRes.error || formRes.error) {
    throw new Error('Ein Fehler ist aufgetreten.');
  }

  const deliverables = (delRes.data ?? []) as Deliverable[];
  const latestForm = (formRes.data?.[0] ?? null) as { id: string; status: Form['status'] } | null;

  return (
    <Dashboard
      company={client.company}
      deliverables={deliverables}
      questionnaireFormId={latestForm?.id ?? null}
      questionnaireStatus={latestForm?.status ?? null}
      clientSlug={clientSlug}
      projectPlan={
        Array.isArray(client.metadata?.project_plan)
          ? client.metadata.project_plan.filter((s: PlanStep) => typeof s?.key === 'string')
          : null
      }
    />
  );
}
