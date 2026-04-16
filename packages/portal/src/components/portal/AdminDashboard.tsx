import type { AdminClient, AdminDeliverable, AdminForm, DeliverableType } from '@/lib/types';
import { DELIVERABLE_LABELS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Props {
  clients: AdminClient[];
  deliverables: AdminDeliverable[];
  forms: AdminForm[];
}

type DotState = 'viewed' | 'published' | 'waiting' | 'none';

const DOT_STYLES: Record<DotState, string> = {
  viewed: 'bg-success',
  published: 'bg-primary',
  waiting: 'bg-destructive',
  none: 'bg-border',
};

interface PipelineColumn {
  label: string;
  type: 'form' | DeliverableType;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { label: 'Fragebogen', type: 'form' },
  { label: 'Analyse', type: 'analysis' },
  { label: 'Mood Board', type: 'mood-board' },
  { label: 'Brand Guide', type: 'brand-guide' },
  { label: 'Preview', type: 'website-preview' },
  { label: 'Angebot', type: 'proposal' },
];

interface Alert {
  clientName: string;
  description: string;
  href: string;
}

function getDeliverableDot(deliverables: AdminDeliverable[], clientId: string, type: string): DotState {
  const d = deliverables.find((x) => x.client_id === clientId && x.type === type);
  if (!d) return 'none';
  if (d.viewed_at) return 'viewed';
  return 'published';
}

function getFormDot(forms: AdminForm[], clientId: string): DotState {
  const f = forms.find((x) => x.client_id === clientId);
  if (!f) return 'none';
  if (f.status === 'completed') return 'viewed';
  if (f.status === 'sent') return 'waiting';
  return 'published';
}

function buildAlerts(
  clients: AdminClient[],
  deliverables: AdminDeliverable[],
  forms: AdminForm[],
): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

  for (const client of clients) {
    // Deliverables unviewed > 48h
    for (const d of deliverables.filter((x) => x.client_id === client.id && !x.viewed_at)) {
      const publishedAt = new Date(d.published_at).getTime();
      if (now - publishedAt > TWO_DAYS) {
        const label = DELIVERABLE_LABELS[d.type as DeliverableType] ?? d.type;
        const days = Math.floor((now - publishedAt) / (24 * 60 * 60 * 1000));
        alerts.push({
          clientName: client.company,
          description: `${label} seit ${days === 1 ? '1 Tag' : `${days} Tagen`} ungesehen`,
          href: `/portal/deliverables/${d.type}?client=${client.slug}`,
        });
      }
    }

    // Forms unanswered > 48h (only sent forms count — published = drafted but not sent to client)
    for (const f of forms.filter(
      (x) => x.client_id === client.id && x.status === 'sent',
    )) {
      const sentAt = new Date(f.sent_at ?? f.created_at).getTime();
      if (now - sentAt > TWO_DAYS) {
        const days = Math.floor((now - sentAt) / (24 * 60 * 60 * 1000));
        alerts.push({
          clientName: client.company,
          description: `Fragebogen seit ${days === 1 ? '1 Tag' : `${days} Tagen`} unbeantwortet`,
          href: `/portal/questionnaire/${f.id}?client=${client.slug}`,
        });
      }
    }
  }

  return alerts;
}

function Dot({ state, title }: { state: DotState; title: string }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-sm mx-auto ${DOT_STYLES[state]}`}
      title={title}
    />
  );
}

export default function AdminDashboard({ clients, deliverables, forms }: Props) {
  const alerts = buildAlerts(clients, deliverables, forms);
  const viewedCount = deliverables.filter((d) => d.viewed_at).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Admin-Übersicht</p>
        </div>
        <div className="flex gap-3 sm:gap-4">
          <Card className="flex-1 sm:flex-none">
            <CardContent className="text-center p-3 sm:p-4">
              <div className="text-2xl font-bold text-primary">{clients.length}</div>
              <div className="text-xs text-muted-foreground">Clients</div>
            </CardContent>
          </Card>
          <Card className="flex-1 sm:flex-none">
            <CardContent className="text-center p-3 sm:p-4">
              <div className="text-2xl font-bold text-destructive">{alerts.length}</div>
              <div className="text-xs text-muted-foreground">Warten</div>
            </CardContent>
          </Card>
          <Card className="flex-1 sm:flex-none">
            <CardContent className="text-center p-3 sm:p-4">
              <div className="text-2xl font-bold text-success">{viewedCount}</div>
              <div className="text-xs text-muted-foreground">Gesehen</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-destructive mb-3">
            ⚡ Aktion nötig
          </div>
          <div className="flex flex-col gap-2">
            {alerts.map((alert, i) => (
              <a key={i} href={alert.href} className="block no-underline">
                <Card className="border-l-4 border-l-accent hover:shadow-md transition-shadow">
                  <CardContent className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">{alert.clientName}</span>
                      <span className="text-muted-foreground text-sm"> — {alert.description}</span>
                    </div>
                    <span className="text-primary text-sm">→</span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Dot-Matrix Pipeline */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Pipeline
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Client</TableHead>
                {PIPELINE_COLUMNS.map((col) => (
                  <TableHead key={col.label} className="text-center w-20">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="pr-4">
                    <a
                      href={`/portal/dashboard?client=${client.slug}`}
                      className="font-semibold text-sm text-foreground hover:underline"
                    >
                      {client.company}
                    </a>
                    {client.industry_key && (
                      <span className="text-xs text-muted-foreground ml-2">{client.industry_key}</span>
                    )}
                  </TableCell>
                  {PIPELINE_COLUMNS.map((col) => {
                    const state = col.type === 'form'
                      ? getFormDot(forms, client.id)
                      : getDeliverableDot(deliverables, client.id, col.type);

                    const isClickable = state !== 'none';
                    let href = '#';
                    if (isClickable) {
                      if (col.type === 'form') {
                        const form = forms.find((f) => f.client_id === client.id);
                        href = form ? `/portal/questionnaire/${form.id}?client=${client.slug}` : '#';
                      } else {
                        href = `/portal/deliverables/${col.type}?client=${client.slug}`;
                      }
                    }

                    return (
                      <TableCell key={col.label} className="text-center">
                        {isClickable ? (
                          <a href={href} className="inline-block">
                            <Dot state={state} title={`${col.label}: ${state}`} />
                          </a>
                        ) : (
                          <Dot state={state} title={`${col.label}: nicht erstellt`} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {clients.length === 0 && (
          <p className="text-muted-foreground text-sm mt-4">Noch keine Clients angelegt.</p>
        )}
      </div>
    </div>
  );
}
