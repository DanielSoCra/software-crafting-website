import React from 'react';
import type { Deliverable, DeliverableType, Form } from '@/lib/types';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

/** Per-client project plan step, stored in client.metadata.project_plan */
export interface PlanStep {
  key: string;
  label?: string;
  icon?: string;
  status?: StepStatus;
  description?: string;
  href?: string;
}

interface Props {
  company: string;
  deliverables: Deliverable[];
  questionnaireFormId: string | null;
  questionnaireStatus: Form['status'] | null;
  clientSlug?: string;
  projectPlan?: PlanStep[] | null;
}

type StepStatus = 'completed' | 'ready' | 'in_progress' | 'upcoming';
type StepOwner = 'agency' | 'client' | 'both';

interface ProjectStep {
  id: string;
  label: string;
  icon: string;
  status: StepStatus;
  description: string;
  href?: string;
  ctaLabel: string;
  owner: StepOwner;
  duration?: string;
  summary: string;  // Always-visible short description regardless of status
}

interface StepMeta {
  icon: string;
  cta: string;
  owner: StepOwner;
  duration?: string;
  summary: string;  // What this step is about (always shown)
  desc: Record<string, string>;  // Status-specific description
}

const STEP_META: Record<string, StepMeta> = {
  questionnaire: {
    icon: '📋',
    cta: 'Fragebogen öffnen',
    owner: 'client',
    duration: 'ca. 10 Minuten',
    summary: 'Kurze Fragen zu deinem Projekt, damit wir alles Wichtige wissen.',
    desc: {
      ready: 'Ein paar kurze Fragen zu dir und deinem Projekt — damit wir deine Website genau passend gestalten können.',
      resume: 'Du hast schon angefangen. Nimm dir die Zeit, die du brauchst.',
      completed: 'Danke für deine Antworten!',
      in_progress: 'Wird gerade für dich vorbereitet.',
    },
  },
  analysis: {
    icon: '🔍',
    cta: 'Analyse ansehen',
    owner: 'agency',
    duration: 'ca. 2-3 Tage',
    summary: 'Wir analysieren deine Branche, Mitbewerber und Zielgruppe.',
    desc: {
      ready: 'Deine Branchen- und Wettbewerbsanalyse ist fertig.',
      completed: 'Analyse abgeschlossen.',
      in_progress: 'Wir schauen uns deine Branche und deine Mitbewerber an.',
    },
  },
  'mood-board': {
    icon: '🎨',
    cta: 'Designvorschläge ansehen',
    owner: 'both',
    duration: 'ca. 3-5 Tage',
    summary: 'Verschiedene Designrichtungen — du wählst den Stil, der zu dir passt.',
    desc: {
      ready: 'Verschiedene Designrichtungen für dich — welche gefällt dir am besten?',
      completed: 'Designrichtung gewählt.',
      in_progress: 'Wir arbeiten an Designvorschlägen für dich.',
    },
  },
  'brand-guide': {
    icon: '🎯',
    cta: 'Brand Guide ansehen',
    owner: 'agency',
    duration: 'ca. 2-3 Tage',
    summary: 'Farben, Schriften und Stil-Regeln für einen einheitlichen Auftritt.',
    desc: {
      ready: 'Farben, Schriften und Stil — dein einheitlicher Markenauftritt.',
      completed: 'Markenauftritt definiert.',
      in_progress: 'Dein Brand Guide wird gerade erstellt.',
    },
  },
  'website-preview': {
    icon: '🌐',
    cta: 'Vorschau ansehen',
    owner: 'agency',
    duration: 'ca. 1-2 Wochen',
    summary: 'Eine erste lauffähige Version deiner Website zum Anschauen.',
    desc: {
      ready: 'So wird deine neue Website aussehen!',
      completed: 'Vorschau angesehen.',
      in_progress: 'Wir bauen deine Website-Vorschau.',
    },
  },
  proposal: {
    icon: '📄',
    cta: 'Angebot ansehen',
    owner: 'agency',
    duration: 'ca. 1-2 Tage',
    summary: 'Ein verbindliches Angebot mit allen Leistungen und Preisen.',
    desc: {
      ready: 'Dein persönliches Angebot mit allen besprochenen Leistungen.',
      completed: 'Angebot erhalten.',
      in_progress: 'Dein Angebot wird erstellt.',
    },
  },
};

function getDefaultPlan(hasQuestionnaire: boolean): PlanStep[] {
  const plan: PlanStep[] = [];
  if (hasQuestionnaire) plan.push({ key: 'questionnaire' });
  for (const type of DELIVERABLE_TYPES) plan.push({ key: type });
  return plan;
}

function resolveLabel(entry: PlanStep, isQuestionnaire: boolean, isStandardDeliverable: boolean): string {
  if (entry.label) return entry.label;
  if (isQuestionnaire) return 'Fragebogen';
  if (isStandardDeliverable) return DELIVERABLE_LABELS[entry.key as DeliverableType];
  return entry.key;
}

function buildSteps(
  projectPlan: PlanStep[] | null | undefined,
  deliverables: Deliverable[],
  questionnaireFormId: string | null,
  questionnaireStatus: Form['status'] | null,
  queryParam: string,
): ProjectStep[] {
  const deliverableMap = new Map(deliverables.map(d => [d.type, d]));
  const plan = projectPlan ?? getDefaultPlan(!!questionnaireFormId);
  const steps: ProjectStep[] = [];
  let hasExplicitInProgress = false;

  for (const entry of plan) {
    const isQuestionnaire = entry.key === 'questionnaire';
    const isStandardDeliverable = (DELIVERABLE_TYPES as readonly string[]).includes(entry.key);
    const meta = STEP_META[entry.key];

    const label = resolveLabel(entry, isQuestionnaire, isStandardDeliverable);
    const icon = entry.icon ?? meta?.icon ?? '📌';
    const owner: StepOwner = meta?.owner ?? 'agency';
    const duration = meta?.duration;
    const summary = meta?.summary ?? '';
    let ctaLabel = meta?.cta ?? 'Ansehen';
    let status: StepStatus;
    let description = '';
    let href: string | undefined;

    if (isQuestionnaire) {
      if (!questionnaireFormId) {
        status = 'upcoming';
      } else if (questionnaireStatus === 'completed') {
        status = 'completed';
        description = meta.desc.completed;
      } else if (questionnaireStatus === 'in_progress') {
        status = 'ready';
        description = meta.desc.resume;
        ctaLabel = 'Fragebogen fortsetzen';
      } else if (questionnaireStatus === 'sent') {
        status = 'ready';
        description = meta.desc.ready;
      } else {
        status = 'upcoming';
        description = meta.desc.in_progress;
      }
      if ((status === 'ready' || status === 'completed') && questionnaireFormId) {
        href = `/portal/questionnaire/${questionnaireFormId}${queryParam}`;
      }
    } else if (isStandardDeliverable) {
      const deliverable = deliverableMap.get(entry.key as DeliverableType);
      if (deliverable?.viewed_at) {
        status = 'completed';
        description = meta?.desc.completed ?? '';
      } else if (deliverable) {
        status = 'ready';
        description = meta?.desc.ready ?? '';
      } else {
        status = 'upcoming';
      }
      if (deliverable) href = `/portal/deliverables/${entry.key}${queryParam}`;
    } else {
      status = entry.status ?? 'upcoming';
      if (status === 'in_progress') hasExplicitInProgress = true;
      // Only allow relative paths and http(s) URLs to prevent javascript: XSS
      if (entry.href && /^(\/|https?:\/\/)/.test(entry.href)) href = entry.href;
    }

    if (entry.description) description = entry.description;

    steps.push({ id: entry.key, label, icon, status, description, href, ctaLabel, owner, duration, summary });
  }

  // Auto-infer first "in_progress": the first 'upcoming' after a completed step
  if (!hasExplicitInProgress) {
    let prevCompleted = true;
    for (const step of steps) {
      if (step.status === 'upcoming' && prevCompleted) {
        step.status = 'in_progress';
        const m = STEP_META[step.id];
        if (m && !step.description) step.description = m.desc.in_progress ?? '';
        break;
      }
      prevCompleted = step.status === 'completed';
    }
  }

  return steps;
}

const OWNER_LABEL: Record<StepOwner, string> = {
  agency: 'Wir machen das',
  client: 'Du bist dran',
  both: 'Gemeinsam',
};

const OWNER_STYLES: Record<StepOwner, string> = {
  agency: 'bg-muted text-muted-foreground border-border',
  client: 'bg-primary/10 text-primary border-primary/30',
  both: 'bg-accent/20 text-accent-foreground border-accent/40',
};

function OwnerBadge({ owner }: { owner: StepOwner }) {
  return (
    <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded border ${OWNER_STYLES[owner]}`}>
      {OWNER_LABEL[owner]}
    </span>
  );
}

function StepDot({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return (
      <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'ready') {
    return (
      <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-primary ring-4 ring-primary/15 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center relative">
        <span className="animate-ping absolute w-3 h-3 rounded-full bg-primary/40" />
        <span className="relative w-2 h-2 rounded-full bg-primary" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-muted border-2 border-border flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
    </div>
  );
}

function StatusPill({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return <Badge variant="outline" className="text-xs border-success/50 text-success">Fertig</Badge>;
  }
  if (status === 'ready') {
    return <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/5">Jetzt dran</Badge>;
  }
  if (status === 'in_progress') {
    return (
      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        Läuft gerade
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground/70">Bald</Badge>;
}

function StepRow({ step }: { step: ProjectStep }) {
  const isActive = step.status === 'ready' || step.status === 'in_progress';

  // Ready = emphasized card with CTA
  if (step.status === 'ready') {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{step.label}</h3>
              <OwnerBadge owner={step.owner} />
            </div>
            <StatusPill status={step.status} />
          </div>
          {step.description && <p className="text-sm text-muted-foreground mb-3">{step.description}</p>}
          {step.duration && (
            <p className="text-xs text-muted-foreground mb-3">
              {step.owner === 'client' ? 'Zeitaufwand für dich' : 'Dauert in der Regel'}: {step.duration}
            </p>
          )}
          {step.href && (
            <Button asChild variant="default" className="h-11 px-5 text-sm">
              <a href={step.href} className="inline-flex items-center gap-1.5">
                {step.ctaLabel}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // In-progress = neutral card
  if (step.status === 'in_progress') {
    return (
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-foreground">{step.label}</h3>
              <OwnerBadge owner={step.owner} />
            </div>
            <StatusPill status={step.status} />
          </div>
          {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
          {step.duration && (
            <p className="text-xs text-muted-foreground mt-2">Dauert in der Regel: {step.duration}</p>
          )}
          {step.owner === 'agency' && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Hier musst du nichts tun — wir melden uns, sobald es weitergeht.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Completed = quiet row with optional "nochmal ansehen"
  if (step.status === 'completed') {
    return (
      <div className="py-2 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{step.label}</span>
        <span className="text-xs text-muted-foreground">— fertig</span>
        {step.href && (
          <a href={step.href} className="text-xs text-primary hover:underline ml-auto">
            nochmal ansehen →
          </a>
        )}
      </div>
    );
  }

  // Upcoming = muted but readable row with summary (not hidden!)
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 flex-wrap mb-0.5">
        <span className="text-sm font-medium text-foreground/80">{step.label}</span>
        <OwnerBadge owner={step.owner} />
        <StatusPill status={step.status} />
      </div>
      {step.summary && (
        <p className="text-xs text-muted-foreground">{step.summary}</p>
      )}
      {step.duration && (
        <p className="text-xs text-muted-foreground/70 mt-0.5">Dauert in der Regel: {step.duration}</p>
      )}
    </div>
  );
}

function StatusSummary({
  steps,
  completedCount,
  isFirstVisit,
}: {
  steps: ProjectStep[];
  completedCount: number;
  isFirstVisit: boolean;
}) {
  if (isFirstVisit) {
    return (
      <Card className="bg-muted/40 border-border/60">
        <CardContent className="p-4">
          <p className="text-sm text-foreground font-medium mb-1">Herzlich willkommen!</p>
          <p className="text-sm text-muted-foreground">
            Wir bereiten gerade alles für dein Projekt vor. Unten siehst du alle Schritte,
            die wir gemeinsam gehen werden.
          </p>
        </CardContent>
      </Card>
    );
  }

  const readySteps = steps.filter(s => s.status === 'ready');
  const inProgressSteps = steps.filter(s => s.status === 'in_progress');

  return (
    <Card className="bg-muted/40 border-border/60">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stand heute
          </span>
        </div>
        <div className="space-y-1.5 text-sm">
          {readySteps.length > 0 && (
            <p className="text-foreground">
              <span className="font-semibold text-primary">Für dich bereit:</span>{' '}
              {readySteps.map(s => s.label).join(', ')}
            </p>
          )}
          {inProgressSteps.length > 0 && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Wir arbeiten an:</span>{' '}
              {inProgressSteps.map(s => s.label).join(', ')}
            </p>
          )}
          {readySteps.length === 0 && inProgressSteps.length === 0 && (
            <p className="text-muted-foreground">
              Alle Schritte abgeschlossen. Gute Arbeit!
            </p>
          )}
          {completedCount > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {completedCount} von {steps.length} Schritten erledigt
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ company, deliverables, questionnaireFormId, questionnaireStatus, clientSlug, projectPlan }: Props) {
  const queryParam = clientSlug ? `?client=${clientSlug}` : '';
  const steps = buildSteps(projectPlan, deliverables, questionnaireFormId, questionnaireStatus, queryParam);

  let completedCount = 0;
  let hasReadyOrInProgress = false;
  for (const step of steps) {
    if (step.status === 'completed') completedCount++;
    if (step.status === 'ready' || step.status === 'in_progress') hasReadyOrInProgress = true;
  }

  const isFirstVisit = completedCount === 0 && !hasReadyOrInProgress;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{company}</h1>
        <p className="text-muted-foreground text-sm mt-1">Dein Website-Projekt</p>

        {completedCount > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <Progress value={(completedCount / steps.length) * 100} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Status summary card */}
      <div className="mb-6">
        <StatusSummary steps={steps} completedCount={completedCount} isFirstVisit={isFirstVisit} />
      </div>

      {/* Full timeline — ALL steps visible */}
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Alle Schritte
        </div>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="relative flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center w-7 flex-shrink-0">
                <StepDot status={step.status} />
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-6 ${
                      step.status === 'completed' ? 'bg-primary/60' : 'bg-border'
                    }`}
                  />
                )}
              </div>
              <div className={`flex-1 -mt-1 ${!isLast ? 'pb-4' : ''} min-w-0`}>
                <StepRow step={step} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Closing help text */}
      <div className="mt-6 p-3 rounded-lg bg-muted/40 border border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Fragen?</strong> Schreib einfach Daniel direkt —
          das Portal ist zum Mitlesen, nicht zum Alleine-lassen. Wir melden uns bei jedem neuen Schritt.
        </p>
      </div>
    </div>
  );
}
