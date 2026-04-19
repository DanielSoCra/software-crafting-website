import type { Deliverable, DeliverableType, Form } from '@/lib/types';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '@/lib/types';

export type StepStatus = 'completed' | 'ready' | 'in_progress' | 'upcoming' | 'also-ready';
export type StepOwner = 'agency' | 'client' | 'both';

export interface PlanStep {
  key: string;
  label?: string;
  icon?: string;
  status?: StepStatus;
  description?: string;
  href?: string;
}

export interface ProjectStep {
  id: string;
  label: string;
  icon: string;
  status: StepStatus;
  description: string;
  href?: string;
  ctaLabel: string;
  owner: StepOwner;
  duration?: string;
  summary: string;
}

interface StepMeta {
  icon: string;
  cta: string;
  owner: StepOwner;
  duration?: string;
  summary: string;
  desc: Record<string, string>;
}

export const STEP_META: Record<string, StepMeta> = {
  questionnaire: {
    icon: '📋',
    cta: 'Fragebogen öffnen',
    owner: 'client',
    duration: '10 Min.',
    summary: 'Kurze Fragen zu deinem Projekt.',
    desc: {
      ready: 'Fragen zu deinem Projekt beantworten.',
      resume: 'Du hast begonnen. Weitermachen, wann du willst.',
      completed: 'Antworten erhalten.',
      in_progress: 'Wird vorbereitet.',
    },
  },
  analysis: {
    icon: '🔍', cta: 'Analyse ansehen', owner: 'agency', duration: '2–3 Tage',
    summary: 'Branchen- und Wettbewerbsanalyse.',
    desc: { ready: 'Analyse ist fertig.', completed: 'Analyse abgeschlossen.', in_progress: 'Analyse läuft.' },
  },
  'mood-board': {
    icon: '🎨', cta: 'Designvorschläge ansehen', owner: 'both', duration: '3–5 Tage',
    summary: 'Designrichtungen zur Auswahl.',
    desc: { ready: 'Wähle die passende Designrichtung.', completed: 'Richtung gewählt.', in_progress: 'Entwürfe in Arbeit.' },
  },
  'brand-guide': {
    icon: '🎯', cta: 'Brand Guide ansehen', owner: 'agency', duration: '2–3 Tage',
    summary: 'Farben, Schriften, Stilrichtlinien.',
    desc: { ready: 'Brand Guide ist fertig.', completed: 'Brand Guide abgeschlossen.', in_progress: 'Brand Guide in Arbeit.' },
  },
  'website-preview': {
    icon: '🌐', cta: 'Vorschau ansehen', owner: 'agency', duration: '1–2 Wochen',
    summary: 'Lauffähige Vorschau deiner Website.',
    desc: { ready: 'Vorschau bereit zum Ansehen.', completed: 'Vorschau angesehen.', in_progress: 'Umsetzung läuft.' },
  },
  proposal: {
    icon: '📄', cta: 'Angebot ansehen', owner: 'agency', duration: '1–2 Tage',
    summary: 'Verbindliches Angebot mit Leistungen und Preisen.',
    desc: { ready: 'Angebot liegt vor.', completed: 'Angebot erhalten.', in_progress: 'Angebot wird erstellt.' },
  },
};

export type Phase = 'discovery' | 'delivery';

export function getDefaultPlan(hasQuestionnaire: boolean, phase: Phase = 'delivery'): PlanStep[] {
  const plan: PlanStep[] = [];
  if (phase === 'discovery') {
    if (hasQuestionnaire) plan.push({ key: 'questionnaire' });
    plan.push({ key: 'next-step' });
    return plan;
  }
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

export function buildSteps(
  projectPlan: PlanStep[] | null | undefined,
  deliverables: Deliverable[],
  questionnaireFormId: string | null,
  questionnaireStatus: Form['status'] | null,
  queryParam: string,
  phase: Phase = 'delivery',
): ProjectStep[] {
  const deliverableMap = new Map(deliverables.map(d => [d.type, d]));
  const plan = projectPlan ?? getDefaultPlan(!!questionnaireFormId, phase);
  const steps: ProjectStep[] = [];
  let hasExplicitInProgress = false;

  for (const entry of plan) {
    const isQuestionnaire = entry.key === 'questionnaire';
    const isStandardDeliverable = (DELIVERABLE_TYPES as readonly string[]).includes(entry.key);
    const isNextStep = entry.key === 'next-step';
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

    if (isNextStep) {
      // Hide when no form exists — next-step only makes sense after a questionnaire was sent
      if (!questionnaireFormId) continue;
      // Hide when form is still draft/published (not yet sent to the client) — next-step is a client-facing row
      if (questionnaireStatus === 'draft' || questionnaireStatus === 'published') continue;

      const waitingCopy = 'Nach deinen Antworten melden wir uns mit einem Angebot.';
      const thanksCopy = 'Danke! Wir melden uns in 2–3 Tagen mit einem Angebot.';
      const nextLabel = entry.label ?? 'Nächste Schritte';
      const nextOwner: StepOwner = 'agency';

      if (questionnaireStatus === 'completed') {
        steps.push({
          id: 'next-step',
          label: nextLabel,
          icon: entry.icon ?? '✉️',
          status: 'in_progress',
          description: entry.description ?? thanksCopy,
          href: undefined,
          ctaLabel: '',
          owner: nextOwner,
          duration: undefined,
          summary: '',
        });
        hasExplicitInProgress = true;
      } else {
        steps.push({
          id: 'next-step',
          label: nextLabel,
          icon: entry.icon ?? '✉️',
          status: 'upcoming',
          description: entry.description ?? waitingCopy,
          href: undefined,
          ctaLabel: '',
          owner: nextOwner,
          duration: undefined,
          summary: waitingCopy,
        });
        // Lock out auto-infer: next-step's status is fully determined by this
        // branch and must never be promoted by the "first upcoming after completed"
        // rule. Without this, `[next-step]` alone or as the first upcoming row
        // gets promoted to in_progress (the initial prevCompleted=true in the
        // auto-infer loop triggers the first-upcoming rule).
        hasExplicitInProgress = true;
      }
      continue;
    }

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
      if (entry.href && /^(\/|https?:\/\/)/.test(entry.href)) href = entry.href;
    }

    if (entry.description) description = entry.description;

    steps.push({ id: entry.key, label, icon, status, description, href, ctaLabel, owner, duration, summary });
  }

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

  // Multi-ready demotion: keep the first 'ready' as-is; later 'ready' steps become 'also-ready'.
  // Runs AFTER the in_progress auto-infer so the ordering is deterministic.
  let seenReady = false;
  for (const step of steps) {
    if (step.status === 'ready') {
      if (seenReady) step.status = 'also-ready';
      else seenReady = true;
    }
  }

  return steps;
}
