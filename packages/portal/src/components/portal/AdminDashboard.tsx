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

const DOT_COLORS: Record<DotState, string> = {
  viewed: 'var(--color-success)',
  published: 'var(--primary)',
  waiting: 'var(--destructive)',
  none: 'var(--border)',
};

const PIPELINE_COLUMNS: Array<{ label: string; type: DeliverableType | 'form' }> = [
  { label: 'Fragebogen', type: 'form' },
  { label: 'Analyse', type: 'analysis' },
  { label: 'Mood Board', type: 'mood-board' },
  { label: 'Brand Guide', type: 'brand-guide' },
  { label: 'Preview', type: 'website-preview' },
  { label: 'Angebot', type: 'proposal' },
];

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function relativeDays(dateStr: string): string {
  const days = Math.floor(hoursAgo(dateStr) / 24);
  if (days === 0) return 'seit heute';
  if (days === 1) return 'seit 1 Tag';
  if (days < 7) return `seit ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'seit 1 Woche' : `seit ${weeks} Wochen`;
}

function getDeliverableDot(
  deliverables: AdminDeliverable[],
  clientId: string,
  type: DeliverableType,
): DotState {
  const d = deliverables.find((d) => d.client_id === clientId && d.type === type);
  if (!d) return 'none';
  if (d.viewed_at) return 'viewed';
  if (hoursAgo(d.published_at) > 48) return 'waiting';
  return 'published';
}

function getFormDot(forms: AdminForm[], clientId: string): DotState {
  const f = forms.find((f) => f.client_id === clientId);
  if (!f) return 'none';
  if (f.status === 'completed') return 'viewed';
  if (f.status === 'in_progress') return 'published';
  if (f.status === 'published') return 'published';
  if (f.status === 'sent') {
    return hoursAgo(f.updated_at) > 48 ? 'waiting' : 'published';
  }
  // draft
  return 'none';
}

interface Alert {
  clientName: string;
  clientSlug: string;
  description: string;
  href: string;
  waitingSince: string;
}

function buildAlerts(
  clients: AdminClient[],
  deliverables: AdminDeliverable[],
  forms: AdminForm[],
): Alert[] {
  const alerts: Alert[] = [];
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  // Deliverable alerts: published > 48h, not viewed
  for (const d of deliverables) {
    if (d.viewed_at) continue;
    if (hoursAgo(d.published_at) <= 48) continue;
    const client = clientMap.get(d.client_id);
    if (!client) continue;
    alerts.push({
      clientName: client.company,
      clientSlug: client.slug,
      description: `${DELIVERABLE_LABELS[d.type]} ${relativeDays(d.published_at)} ungesehen`,
      href: `/portal/deliverables/${d.type}?client=${client.slug}`,
      waitingSince: d.published_at,
    });
  }

  // Form alerts: sent > 48h (based on updated_at)
  for (const f of forms) {
    if (f.status !== 'sent') continue;
    if (hoursAgo(f.updated_at) <= 48) continue;
    const client = clientMap.get(f.client_id);
    if (!client) continue;
    alerts.push({
      clientName: client.company,
      clientSlug: client.slug,
      description: `Fragebogen ${relativeDays(f.updated_at)} unbeantwortet`,
      href: `/portal/questionnaire/${f.id}?client=${client.slug}`,
      waitingSince: f.updated_at,
    });
  }

  // Sort: longest waiting first
  alerts.sort((a, b) => new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime());

  return alerts;
}

export default function AdminDashboard({ clients, deliverables, forms }: Props) {
  const alerts = buildAlerts(clients, deliverables, forms);

  const viewedCount = deliverables.filter((d) => d.viewed_at).length
    + forms.filter((f) => f.status === 'completed').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Admin-Übersicht</p>
        </div>
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary-light)' }}>{clients.length}</div>
              <div className="text-xs text-muted-foreground">Clients</div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold" style={{ color: 'var(--destructive)' }}>{alerts.length}</div>
              <div className="text-xs text-muted-foreground">Warten</div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{viewedCount}</div>
              <div className="text-xs text-muted-foreground">Gesehen</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--destructive)' }}
          >
            ⚡ Aktion nötig
          </div>
          <div className="flex flex-col gap-2">
            {alerts.map((alert, i) => (
              <a key={i} href={alert.href} className="block" style={{ textDecoration: 'none' }}>
                <Card className="border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: 'var(--color-accent)' }}>
                  <CardContent className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">{alert.clientName}</span>
                      <span className="text-muted-foreground text-sm"> — {alert.description}</span>
                    </div>
                    <span style={{ color: 'var(--primary)' }} className="text-sm">→</span>
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
        <Table style={{ minWidth: '600px' }}>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: '200px' }}>Client</TableHead>
              {PIPELINE_COLUMNS.map((col) => (
                <TableHead key={col.label} className="text-center" style={{ width: '80px' }}>
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
                    className="font-semibold text-sm hover:underline"
                    style={{ color: 'var(--color-text)', textDecoration: 'none' }}
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
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '2px',
                              backgroundColor: DOT_COLORS[state],
                              margin: '0 auto',
                            }}
                            title={`${col.label}: ${state}`}
                          />
                        </a>
                      ) : (
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '2px',
                            backgroundColor: DOT_COLORS[state],
                            margin: '0 auto',
                          }}
                          title={`${col.label}: nicht erstellt`}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {clients.length === 0 && (
          <p className="text-muted-foreground text-sm mt-4">Noch keine Clients angelegt.</p>
        )}
      </div>
    </div>
  );
}
