import type { Deliverable, DeliverableType } from '../../lib/types';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '../../lib/types';

// --- Types ---

/** Per-client project plan step, stored in client.metadata.project_plan */
export interface PlanStep {
  key: string;              // deliverable type, 'questionnaire', or custom key
  label?: string;           // override default label
  icon?: string;            // override default icon
  status?: StepStatus;      // for custom steps: explicit status
  description?: string;     // override auto-generated description
  href?: string;            // for custom steps: link target
}

interface Props {
  company: string;
  deliverables: Deliverable[];
  questionnaireFormId: string | null;
  questionnaireStatus: string | null;
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

// --- Default step metadata ---

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

// --- Step building ---

function getDefaultPlan(hasQuestionnaire: boolean): PlanStep[] {
  const plan: PlanStep[] = [];
  if (hasQuestionnaire) plan.push({ key: 'questionnaire' });
  for (const type of DELIVERABLE_TYPES) plan.push({ key: type });
  return plan;
}

function buildSteps(
  projectPlan: PlanStep[] | null | undefined,
  deliverables: Deliverable[],
  questionnaireFormId: string | null,
  questionnaireStatus: string | null,
  queryParam: string,
): ProjectStep[] {
  const deliverableMap = new Map(deliverables.map(d => [d.type, d]));
  const plan = projectPlan ?? getDefaultPlan(!!questionnaireFormId);
  const steps: ProjectStep[] = [];

  for (const entry of plan) {
    const isQuestionnaire = entry.key === 'questionnaire';
    const isStandardDeliverable = (DELIVERABLE_TYPES as readonly string[]).includes(entry.key);
    const meta = STEP_META[entry.key];

    const label = entry.label
      ?? (isQuestionnaire ? 'Fragebogen' : isStandardDeliverable ? DELIVERABLE_LABELS[entry.key as DeliverableType] : entry.key);
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
      // Custom step — status & href from plan entry
      status = entry.status ?? 'upcoming';
      href = entry.href;
    }

    // Plan-level description always wins
    if (entry.description) description = entry.description;

    steps.push({ id: entry.key, label, icon, status, description, href, ctaLabel });
  }

  // Auto-infer first "in_progress" step: the first 'upcoming' after a completed step
  let prevCompleted = true;
  let foundInProgress = steps.some(s => s.status === 'in_progress');
  for (const step of steps) {
    if (step.status === 'upcoming' && prevCompleted && !foundInProgress) {
      step.status = 'in_progress';
      const meta = STEP_META[step.id];
      if (meta && !step.description) step.description = meta.desc.in_progress ?? '';
      foundInProgress = true;
    }
    prevCompleted = step.status === 'completed';
  }

  return steps;
}

// --- Sub-components ---

function StepDot({ status, icon, isActive }: { status: StepStatus; icon: string; isActive: boolean }) {
  if (status === 'completed') {
    return (
      <div className="w-7 h-7 rounded-full bg-teal-50 border-2 border-teal-300 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'ready') {
    return (
      <div className={`w-7 h-7 rounded-full bg-teal-50 border-2 border-teal-300 flex items-center justify-center ${isActive ? 'ring-4 ring-teal-300/20' : ''}`}>
        <span className="text-xs leading-none">{icon}</span>
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
        <span className="text-xs leading-none">{icon}</span>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-gray-200" />
    </div>
  );
}

function ReadyCard({ step }: { step: ProjectStep }) {
  return (
    <div className="rounded-xl border bg-teal-50 border-teal-300 p-4">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-semibold text-gray-900">{step.label}</h3>
        <span className="text-xs font-medium text-teal-700 border border-teal-300 rounded-full px-2 py-0.5 whitespace-nowrap">
          Bereit
        </span>
      </div>
      {step.description && <p className="text-sm text-gray-600 mb-3">{step.description}</p>}
      {step.href && (
        <a
          href={step.href}
          className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {step.ctaLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      )}
    </div>
  );
}

function CompletedRow({ step }: { step: ProjectStep }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm font-medium text-gray-600">{step.label}</span>
      {step.href && (
        <a href={step.href} className="text-xs text-teal-600 hover:underline ml-auto">
          nochmal ansehen
        </a>
      )}
    </div>
  );
}

function InProgressCard({ step }: { step: ProjectStep }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-medium text-gray-700">{step.label}</h3>
        <span className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'oklch(0.8 0.15 85)' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'oklch(0.8 0.15 85)' }} />
          </span>
          In Bearbeitung
        </span>
      </div>
      {step.description && <p className="text-sm text-gray-500">{step.description}</p>}
    </div>
  );
}

function UpcomingRow({ step }: { step: ProjectStep }) {
  return (
    <div className="py-1">
      <span className="text-sm text-gray-400">{step.label}</span>
    </div>
  );
}

// --- Main component ---

export default function Dashboard({ company, deliverables, questionnaireFormId, questionnaireStatus, clientSlug, projectPlan }: Props) {
  const queryParam = clientSlug ? `?client=${clientSlug}` : '';
  const steps = buildSteps(projectPlan, deliverables, questionnaireFormId, questionnaireStatus, queryParam);

  const activeIndex = steps.findIndex(s => s.status !== 'completed');

  // Progressive disclosure: hide far-future steps when nothing is completed yet
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const hasReadyOrInProgress = steps.some(s => s.status === 'ready' || s.status === 'in_progress');
  let visibleSteps: ProjectStep[];
  let hiddenCount: number;

  if (completedCount > 0 || !hasReadyOrInProgress) {
    // Show all steps once progress is happening, or if everything is upcoming
    visibleSteps = steps;
    hiddenCount = 0;
  } else {
    // Early stage: show active step + 2 upcoming as preview
    const showUpTo = Math.min((activeIndex < 0 ? 0 : activeIndex) + 3, steps.length);
    visibleSteps = steps.slice(0, showUpTo);
    hiddenCount = steps.length - showUpTo;
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{company}</h1>
        <p className="text-gray-500 text-sm mt-1">Projektübersicht</p>

        {completedCount > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-gray-50 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-700"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative ml-1">
        {visibleSteps.map((step, i) => {
          const isActive = i === activeIndex;
          const isLastVisible = i === visibleSteps.length - 1;
          const showLine = !isLastVisible || hiddenCount > 0;

          return (
            <div key={step.id} className="relative flex gap-4">
              <div className="flex flex-col items-center w-7 flex-shrink-0">
                <StepDot status={step.status} icon={step.icon} isActive={isActive} />
                {showLine && (
                  <div
                    className={`w-px flex-1 min-h-6 ${
                      step.status === 'completed' ? 'bg-teal-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <div className={`flex-1 -mt-1 ${showLine ? 'pb-4' : ''}`}>
                {step.status === 'ready' ? (
                  <ReadyCard step={step} />
                ) : step.status === 'completed' ? (
                  <CompletedRow step={step} />
                ) : step.status === 'in_progress' ? (
                  <InProgressCard step={step} />
                ) : (
                  <UpcomingRow step={step} />
                )}
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div className="flex gap-4 mt-1">
            <div className="w-7 flex-shrink-0 flex justify-center">
              <span className="text-gray-400 text-lg leading-none">&#x22EE;</span>
            </div>
            <div className="text-sm text-gray-400">
              … und {hiddenCount} weitere {hiddenCount === 1 ? 'Schritt' : 'Schritte'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
