import React from 'react';
import type { Deliverable, DeliverableType, Form } from '../../lib/types';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '../../lib/types';
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

interface ProjectStep {
  id: string;
  label: string;
  icon: string;
  status: StepStatus;
  description: string;
  href?: string;
  ctaLabel: string;
}

const STEP_META: Record<string, { icon: string; cta: string; desc: Record<string, string> }> = {
  questionnaire: {
    icon: '📋',
    cta: 'Fragebogen öffnen',
    desc: {
      ready: 'Erzählen Sie uns von Ihrem Unternehmen und Ihren Zielen — so können wir Ihre Website genau auf Sie zuschneiden.',
      resume: 'Sie haben bereits begonnen. Nehmen Sie sich die Zeit, die Sie brauchen.',
      completed: 'Vielen Dank für Ihre Antworten!',
      in_progress: 'Wird gerade für Sie vorbereitet.',
    },
  },
  analysis: {
    icon: '🔍',
    cta: 'Analyse ansehen',
    desc: {
      ready: 'Ihre Branchen- und Wettbewerbsanalyse ist fertig.',
      completed: 'Analyse abgeschlossen.',
      in_progress: 'Wir analysieren Ihre Branche und Wettbewerber.',
    },
  },
  'mood-board': {
    icon: '🎨',
    cta: 'Designvorschläge ansehen',
    desc: {
      ready: 'Wählen Sie Ihre Lieblingsrichtung aus unseren Designvorschlägen.',
      completed: 'Designrichtung gewählt.',
      in_progress: 'Wir erstellen Designvorschläge für Sie.',
    },
  },
  'brand-guide': {
    icon: '🎯',
    cta: 'Brand Guide ansehen',
    desc: {
      ready: 'Farben, Schriften und Stil — Ihr einheitlicher Markenauftritt.',
      completed: 'Markenauftritt definiert.',
      in_progress: 'Ihr Brand Guide wird erstellt.',
    },
  },
  'website-preview': {
    icon: '🌐',
    cta: 'Vorschau ansehen',
    desc: {
      ready: 'So wird Ihre neue Website aussehen.',
      completed: 'Vorschau angesehen.',
      in_progress: 'Wir bauen Ihre Website-Vorschau.',
    },
  },
  proposal: {
    icon: '📄',
    cta: 'Angebot ansehen',
    desc: {
      ready: 'Ihr individuelles Angebot mit allen besprochenen Leistungen.',
      completed: 'Angebot erhalten.',
      in_progress: 'Ihr Angebot wird erstellt.',
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

    steps.push({ id: entry.key, label, icon, status, description, href, ctaLabel });
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

const DOT_STYLES: Record<StepStatus, string> = {
  completed: 'bg-[var(--primary)]/10 border-[var(--primary)]/40',
  ready: 'bg-[var(--primary)]/10 border-[var(--primary)]/40',
  in_progress: 'bg-card border-[var(--border)]',
  upcoming: 'bg-muted border-[var(--border)]',
};

function StepDot({ status, icon, isActive }: { status: StepStatus; icon: string; isActive: boolean }) {
  const ring = status === 'ready' && isActive ? ' ring-4 ring-[var(--primary)]/20' : '';
  const inner =
    status === 'completed' ? (
      <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : status === 'upcoming' ? (
      <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
    ) : (
      <span className="text-xs leading-none">{icon}</span>
    );

  return (
    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${DOT_STYLES[status]}${ring}`}>
      {inner}
    </div>
  );
}

function ReadyCard({ step }: { step: ProjectStep }) {
  return (
    <Card className="border-[var(--primary)]/30 bg-[var(--primary)]/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-foreground">{step.label}</h3>
          <Badge variant="outline" className="border-[var(--primary)]/50 text-[var(--primary)]">Bereit</Badge>
        </div>
        {step.description && <p className="text-sm text-muted-foreground mb-3">{step.description}</p>}
        {step.href && (
          <Button asChild variant="default" size="sm">
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

function CompletedRow({ step }: { step: ProjectStep }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm font-medium text-muted-foreground">{step.label}</span>
      {step.href && (
        <a href={step.href} className="text-xs text-[var(--primary)] hover:underline ml-auto">
          nochmal ansehen
        </a>
      )}
    </div>
  );
}

function InProgressCard({ step }: { step: ProjectStep }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-foreground">{step.label}</h3>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--color-accent)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--color-accent)' }} />
            </span>
            In Bearbeitung
          </span>
        </div>
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
      </CardContent>
    </Card>
  );
}

function UpcomingRow({ step }: { step: ProjectStep }) {
  return (
    <div className="py-1">
      <span className="text-sm text-muted-foreground">{step.label}</span>
    </div>
  );
}

const STEP_CARD: Record<StepStatus, (props: { step: ProjectStep }) => React.ReactElement> = {
  ready: ReadyCard,
  completed: CompletedRow,
  in_progress: InProgressCard,
  upcoming: UpcomingRow,
};

export default function Dashboard({ company, deliverables, questionnaireFormId, questionnaireStatus, clientSlug, projectPlan }: Props) {
  const queryParam = clientSlug ? `?client=${clientSlug}` : '';
  const steps = buildSteps(projectPlan, deliverables, questionnaireFormId, questionnaireStatus, queryParam);

  // Single pass to derive all needed values
  let activeIndex = -1;
  let completedCount = 0;
  let hasReadyOrInProgress = false;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i].status;
    if (s === 'completed') completedCount++;
    if (s !== 'completed' && activeIndex === -1) activeIndex = i;
    if (s === 'ready' || s === 'in_progress') hasReadyOrInProgress = true;
  }

  let visibleSteps: ProjectStep[];
  let hiddenCount: number;
  if (completedCount > 0 || !hasReadyOrInProgress) {
    visibleSteps = steps;
    hiddenCount = 0;
  } else {
    const showUpTo = Math.min((activeIndex < 0 ? 0 : activeIndex) + 3, steps.length);
    visibleSteps = steps.slice(0, showUpTo);
    hiddenCount = steps.length - showUpTo;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{company}</h1>
        <p className="text-muted-foreground text-sm mt-1">Projektübersicht</p>

        {completedCount > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <Progress value={(completedCount / steps.length) * 100} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
        )}
      </div>

      <div className="relative ml-1">
        {visibleSteps.map((step, i) => {
          const isActive = i === activeIndex;
          const isLastVisible = i === visibleSteps.length - 1;
          const showLine = !isLastVisible || hiddenCount > 0;
          const StepCard = STEP_CARD[step.status] ?? UpcomingRow;

          return (
            <div key={step.id} className="relative flex gap-4">
              <div className="flex flex-col items-center w-7 flex-shrink-0">
                <StepDot status={step.status} icon={step.icon} isActive={isActive} />
                {showLine && (
                  <div
                    className={`w-px flex-1 min-h-6 ${
                      step.status === 'completed' ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
                  />
                )}
              </div>
              <div className={`flex-1 -mt-1 ${showLine ? 'pb-4' : ''}`}>
                <StepCard step={step} />
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div className="flex gap-4 mt-1">
            <div className="w-7 flex-shrink-0 flex justify-center">
              <span className="text-muted-foreground text-lg leading-none">&#x22EE;</span>
            </div>
            <div className="text-sm text-muted-foreground">
              … und {hiddenCount} weitere {hiddenCount === 1 ? 'Schritt' : 'Schritte'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
