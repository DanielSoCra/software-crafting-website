import React from 'react';
import type { Deliverable, Form } from '@/lib/types';
import {
  buildSteps,
  type PlanStep,
  type ProjectStep,
  type StepStatus,
  type StepOwner,
  STEP_META,
} from '@/lib/dashboard-plan';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export type { PlanStep };

interface Props {
  company: string;
  deliverables: Deliverable[];
  questionnaireFormId: string | null;
  questionnaireStatus: Form['status'] | null;
  clientSlug?: string;
  projectPlan?: PlanStep[] | null;
  phase: 'discovery' | 'delivery';
}

const OWNER_LABEL: Record<StepOwner, string> = {
  agency: 'Agentur',
  client: 'Du',
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
  if (status === 'also-ready') {
    return (
      <div className="w-7 h-7 rounded-full bg-primary/5 border-2 border-primary/40 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
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
    return <Badge variant="outline" className="text-xs border-success/50 text-success">Erledigt</Badge>;
  }
  if (status === 'ready') {
    return <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/5">Offen</Badge>;
  }
  if (status === 'in_progress') {
    return (
      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        In Arbeit
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground/70">Geplant</Badge>;
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
              {step.owner === 'client' ? 'Dein Aufwand' : 'Dauer'}: {step.duration}
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
            <p className="text-xs text-muted-foreground mt-2">Dauer: {step.duration}</p>
          )}
          {step.owner === 'agency' && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Keine Aktion nötig. Wir melden uns, sobald es weitergeht.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Completed = quiet row with optional "Ansehen"
  if (step.status === 'completed') {
    return (
      <div className="py-2 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{step.label}</span>
        {step.href && (
          <a href={step.href} className="text-xs text-primary hover:underline ml-auto">
            Ansehen
          </a>
        )}
      </div>
    );
  }

  if (step.status === 'also-ready') {
    return (
      <div className="py-2 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Auch schon offen:</span>
        <span className="text-sm font-medium text-foreground">{step.label}</span>
        {step.href && (
          <a href={step.href} className="text-sm text-primary hover:underline ml-auto inline-flex items-center gap-1">
            Ansehen
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
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
        <p className="text-xs text-muted-foreground/70 mt-0.5">Dauer: {step.duration}</p>
      )}
    </div>
  );
}

function StatusSummary({
  steps,
  completedCount,
  isFirstVisit,
  phase,
  questionnaireStatus,
}: {
  steps: ProjectStep[];
  completedCount: number;
  isFirstVisit: boolean;
  phase: 'discovery' | 'delivery';
  questionnaireStatus: Form['status'] | null;
}) {
  if (phase === 'discovery') {
    const copy =
      questionnaireStatus === 'completed'
        ? 'Antworten erhalten — wir melden uns.'
        : 'Fragebogen offen — ca. 10 Min.';
    return (
      <Card className="bg-muted/40 border-border/60">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{copy}</p>
        </CardContent>
      </Card>
    );
  }

  if (isFirstVisit) {
    return (
      <Card className="bg-muted/40 border-border/60">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Projekt angelegt. Die Schritte unten zeigen den geplanten Ablauf.
          </p>
        </CardContent>
      </Card>
    );
  }

  const readySteps = steps.filter(s => s.status === 'ready');
  const inProgressSteps = steps.filter(s => s.status === 'in_progress');

  return (
    <Card className="bg-muted/40 border-border/60">
      <CardContent className="p-4 space-y-1.5 text-sm">
        {readySteps.length > 0 && (
          <p>
            <span className="font-semibold text-primary">Offen für dich:</span>{' '}
            <span className="text-foreground">{readySteps.map(s => s.label).join(', ')}</span>
          </p>
        )}
        {inProgressSteps.length > 0 && (
          <p>
            <span className="font-medium text-foreground">In Arbeit:</span>{' '}
            <span className="text-muted-foreground">{inProgressSteps.map(s => s.label).join(', ')}</span>
          </p>
        )}
        {readySteps.length === 0 && inProgressSteps.length === 0 && (
          <p className="text-muted-foreground">Alle Schritte abgeschlossen.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard({
  company, deliverables, questionnaireFormId, questionnaireStatus,
  clientSlug, projectPlan, phase,
}: Props) {
  const queryParam = clientSlug ? `?client=${clientSlug}` : '';
  const steps = buildSteps(projectPlan, deliverables, questionnaireFormId, questionnaireStatus, queryParam, phase);

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
        <StatusSummary
          steps={steps}
          completedCount={completedCount}
          isFirstVisit={isFirstVisit}
          phase={phase}
          questionnaireStatus={questionnaireStatus}
        />
      </div>

      {/* Full timeline — ALL steps visible */}
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Ablauf
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

      {/* Contact hint */}
      <p className="mt-6 text-xs text-muted-foreground">
        Fragen? <a href="mailto:daniel@software-crafting.de" className="text-primary hover:underline">daniel@software-crafting.de</a>
      </p>
    </div>
  );
}
