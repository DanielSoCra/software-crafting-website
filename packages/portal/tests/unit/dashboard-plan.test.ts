import { describe, it, expect } from 'vitest';
import { buildSteps, getDefaultPlan } from '@/lib/dashboard-plan';
import type { Deliverable, Form } from '@/lib/types';

describe('getDefaultPlan (baseline)', () => {
  it('includes questionnaire first when a form exists, then all deliverable types', () => {
    const plan = getDefaultPlan(true);
    expect(plan.map(s => s.key)).toEqual([
      'questionnaire', 'analysis', 'mood-board', 'brand-guide', 'website-preview', 'proposal',
    ]);
  });

  it('omits questionnaire when no form', () => {
    const plan = getDefaultPlan(false);
    expect(plan.map(s => s.key)).toEqual([
      'analysis', 'mood-board', 'brand-guide', 'website-preview', 'proposal',
    ]);
  });
});

describe('buildSteps (baseline)', () => {
  it('renders questionnaire as completed when form status is completed', () => {
    const steps = buildSteps(null, [], 'form-123', 'completed' as Form['status'], '');
    const q = steps.find(s => s.id === 'questionnaire');
    expect(q?.status).toBe('completed');
    expect(q?.href).toBe('/portal/questionnaire/form-123');
  });

  it('auto-promotes first upcoming after completed to in_progress', () => {
    const deliverables: Deliverable[] = [
      // analysis viewed → completed; rest upcoming
      { id: 'd1', client_id: 'c1', type: 'analysis', status: 'viewed',
        published_at: '2026-04-01', viewed_at: '2026-04-02', metadata: {},
        created_at: '2026-04-01', updated_at: '2026-04-02' },
    ];
    const steps = buildSteps(null, deliverables, 'f1', 'completed' as Form['status'], '');
    const analysis = steps.find(s => s.id === 'analysis');
    const moodBoard = steps.find(s => s.id === 'mood-board');
    expect(analysis?.status).toBe('completed');
    expect(moodBoard?.status).toBe('in_progress');
  });
});

describe('getDefaultPlan with phase', () => {
  it('discovery phase returns [questionnaire, next-step] when form exists', () => {
    const plan = getDefaultPlan(true, 'discovery');
    expect(plan.map(s => s.key)).toEqual(['questionnaire', 'next-step']);
  });

  it('discovery phase returns [next-step] when no form', () => {
    const plan = getDefaultPlan(false, 'discovery');
    expect(plan.map(s => s.key)).toEqual(['next-step']);
  });

  it('delivery phase returns full pipeline', () => {
    const plan = getDefaultPlan(true, 'delivery');
    expect(plan.map(s => s.key)).toEqual([
      'questionnaire', 'analysis', 'mood-board', 'brand-guide', 'website-preview', 'proposal',
    ]);
  });

  it('delivery phase omits questionnaire when no form', () => {
    const plan = getDefaultPlan(false, 'delivery');
    expect(plan.map(s => s.key)).toEqual([
      'analysis', 'mood-board', 'brand-guide', 'website-preview', 'proposal',
    ]);
  });
});

describe('override wins over phase (load-bearing invariant per spec §2a)', () => {
  it('explicit projectPlan overrides phase=discovery default', () => {
    const steps = buildSteps(
      [{ key: 'analysis' }, { key: 'proposal' }],
      [], 'f1', 'sent' as Form['status'], '', 'discovery'
    );
    expect(steps.map(s => s.id)).toEqual(['analysis', 'proposal']);
    // Crucially: 'next-step' does NOT appear even though phase=discovery
    expect(steps.find(s => s.id === 'next-step')).toBeUndefined();
  });

  it('explicit projectPlan overrides phase=delivery default', () => {
    const steps = buildSteps(
      [{ key: 'questionnaire' }, { key: 'proposal' }],
      [], 'f1', 'completed' as Form['status'], '', 'delivery'
    );
    expect(steps.map(s => s.id)).toEqual(['questionnaire', 'proposal']);
    // No analysis/mood-board/brand-guide/website-preview despite delivery default
  });

  it('empty explicit projectPlan renders zero steps regardless of phase', () => {
    const steps = buildSteps([], [], 'f1', 'sent' as Form['status'], '', 'discovery');
    expect(steps).toHaveLength(0);
  });
});

describe('next-step row rendering', () => {
  const run = (formId: string | null, status: Form['status'] | null) =>
    buildSteps([{ key: 'next-step' }], [], formId, status, '');

  it('is hidden when no form exists', () => {
    const steps = run(null, null);
    expect(steps).toHaveLength(0);
  });

  it('is hidden when form is draft (not yet sent)', () => {
    const steps = run('f1', 'draft' as Form['status']);
    expect(steps).toHaveLength(0);
  });

  it('is hidden when form is published (not yet sent)', () => {
    const steps = run('f1', 'published' as Form['status']);
    expect(steps).toHaveLength(0);
  });

  it('is upcoming when form is sent, not started', () => {
    const steps = run('f1', 'sent' as Form['status']);
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe('upcoming');
    expect(steps[0].description).toContain('Nach deinen Antworten');
  });

  it('is upcoming when form is in_progress', () => {
    const steps = run('f1', 'in_progress' as Form['status']);
    expect(steps[0].status).toBe('upcoming');
  });

  it('is in_progress (waiting) when form is completed', () => {
    const steps = run('f1', 'completed' as Form['status']);
    expect(steps[0].status).toBe('in_progress');
    expect(steps[0].description).toContain('2–3 Tagen');
    expect(steps[0].href).toBeUndefined();
  });
});

describe('multi-ready hierarchy', () => {
  const mkDeliverable = (type: string, viewed: boolean): Deliverable => ({
    id: `d-${type}`, client_id: 'c1', type: type as Deliverable['type'],
    status: viewed ? 'viewed' : 'published',
    published_at: '2026-04-01', viewed_at: viewed ? '2026-04-02' : null, metadata: {},
    created_at: '2026-04-01', updated_at: '2026-04-01',
  });

  it('keeps only the first ready step as ready; later ready steps become also-ready', () => {
    const deliverables = [
      mkDeliverable('analysis', false),    // ready
      mkDeliverable('mood-board', false),  // ready → also-ready
      mkDeliverable('brand-guide', false), // ready → also-ready
    ];
    const steps = buildSteps(null, deliverables, 'f1', 'completed' as Form['status'], '', 'delivery');
    const byId = Object.fromEntries(steps.map(s => [s.id, s.status]));
    expect(byId.analysis).toBe('ready');
    expect(byId['mood-board']).toBe('also-ready');
    expect(byId['brand-guide']).toBe('also-ready');
  });

  it('leaves a single ready step untouched', () => {
    const deliverables = [mkDeliverable('analysis', false)];
    const steps = buildSteps(null, deliverables, 'f1', 'completed' as Form['status'], '', 'delivery');
    expect(steps.find(s => s.id === 'analysis')?.status).toBe('ready');
  });

  it('applies demotion AFTER the in_progress auto-infer', () => {
    // Completed questionnaire + two ready deliverables: analysis ready (first), mood-board ready (also-ready).
    // Nothing upcoming-after-completed so no in_progress promotion should happen.
    const deliverables = [mkDeliverable('analysis', false), mkDeliverable('mood-board', false)];
    const steps = buildSteps(null, deliverables, 'f1', 'completed' as Form['status'], '', 'delivery');
    const inProgress = steps.filter(s => s.status === 'in_progress');
    expect(inProgress).toHaveLength(0);
  });
});
