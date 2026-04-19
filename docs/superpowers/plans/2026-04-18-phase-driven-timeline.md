# Phase-Driven Portal Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `status` + `phase` columns to Supabase `clients`, render the dashboard timeline differently per phase (discovery shows questionnaire + next-step only; delivery shows the full pipeline with multi-ready emphasis), and wire the first status transition into `/invite`.

**Architecture:** Pure plan-building logic is extracted from `Dashboard.tsx` into `@/lib/dashboard-plan.ts` so it's unit-testable. `dashboard/page.tsx` reads `phase` from Supabase and passes it as a prop. `Dashboard.tsx` keeps only React components; new `also-ready` status + synthetic `next-step` row render as new branches in `StepRow`. Migration uses a DO block with row-count assertions. No agency YAML changes — this spec is orthogonal to the separate YAML restoration effort.

**Tech Stack:** Supabase PostgreSQL + jsonb, Next.js 15 App Router, React 18, Vitest, TypeScript, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-04-16-phase-driven-timeline-design.md`

**Execution split (important):** Phases 1 & 2 are executed inside a `software-crafting-website` worktree via `superpowers:subagent-driven-development`. Phases 3 & 4 modify a *different* repository (`~/code/local-web-agency`) and therefore cannot run inside the portal worktree — the subagent orchestrator assumes one repo per worktree. Those phases are executed separately after the portal worktree is merged or kept.

**Rollback appendix:** see Appendix A at the bottom of this file for the full rollback procedure (schema + Bossler's `project_plan` restore).

---

## File Structure

**New:**
- `supabase/migrations/20260418120000_client_status_phase.sql` — adds columns, backfills, clears Bossler's override
- `packages/portal/src/lib/dashboard-plan.ts` — pure plan-building logic extracted from Dashboard.tsx
- `packages/portal/tests/unit/dashboard-plan.test.ts` — unit tests

**Modified:**
- `packages/portal/src/lib/database.types.ts` — regenerated after migration
- `packages/portal/src/app/dashboard/page.tsx` — SELECT `phase`, pass as prop
- `packages/portal/src/components/portal/Dashboard.tsx` — import from dashboard-plan, add `also-ready` + `next-step` StepRow branches, StatusSummary takes `phase`
- `~/code/local-web-agency/.claude/skills/invite/SKILL.md` — add lead→prospect flip
- `~/code/local-web-agency/CLAUDE.md` — add "Client Lifecycle" section

---

## Phase 1: Migration + Types (Commit 1)

### Task 1: Write the migration file

**Files:**
- Create: `supabase/migrations/20260418120000_client_status_phase.sql`

- [ ] **Step 1: Create the migration file with schema + backfill**

File contents:
```sql
-- Adds status + phase columns to clients table (spec: 2026-04-16-phase-driven-timeline-design.md)

alter table public.clients
  add column if not exists status text not null default 'lead'
    check (status in ('lead','prospect','active','paused','churned')),
  add column if not exists phase text not null default 'discovery'
    check (phase in ('discovery','delivery'));

-- Backfill existing real clients + clear Bossler's aspirational project_plan override.
do $$
declare r int;
begin
  update public.clients set status = 'active', phase = 'delivery'
    where slug in ('arinya','gr8progress');
  get diagnostics r = row_count;
  raise notice 'active/delivery backfill: % rows', r;
  if r <> 2 then raise exception 'active/delivery backfill: expected 2 rows, got %', r; end if;

  -- bossler-most: invited, awaiting reply → prospect (not lead)
  update public.clients set status = 'prospect', phase = 'discovery'
    where slug = 'bossler-most';
  get diagnostics r = row_count;
  raise notice 'prospect/discovery backfill: % rows', r;
  if r <> 1 then raise exception 'prospect/discovery backfill: expected 1 row, got %', r; end if;

  -- Clear Bossler's project_plan so phase=discovery default takes over.
  -- Scoped by slug to avoid clearing demo-client overrides (alpinvest, gruenwerk, …).
  update public.clients
    set metadata = metadata - 'project_plan'
    where slug = 'bossler-most' and metadata ? 'project_plan';
  get diagnostics r = row_count;
  raise notice 'cleared bossler-most project_plan: % rows', r;
end $$;
```

- [ ] **Step 2: Snapshot Bossler's current `project_plan` for rollback**

Before the migration clears Bossler's override, capture the exact JSON. Run via `mcp__plugin_supabase_supabase__execute_sql`:

```sql
select metadata->'project_plan' as project_plan
  from public.clients where slug = 'bossler-most';
```

Paste the returned JSON into `docs/superpowers/plans/2026-04-18-phase-driven-timeline-rollback.md` under a heading "Bossler pre-migration project_plan snapshot". If the returned value is `null`, record `null` explicitly — still useful for rollback verification.

This snapshot is the rollback anchor: if we need to undo, we restore this value via `UPDATE clients SET metadata = jsonb_set(metadata, '{project_plan}', '<snapshot>'::jsonb) WHERE slug='bossler-most'`. See Appendix A for the full rollback procedure.

- [ ] **Step 3: Commit the migration file (before applying to prod)**

```bash
cd /Users/daniel/code/software-crafting-website
git add supabase/migrations/20260418120000_client_status_phase.sql docs/superpowers/plans/2026-04-18-phase-driven-timeline-rollback.md
git commit -m "feat(portal): add status + phase columns + clear discovery overrides"
```

Committing before applying ensures that if the MCP apply step fails or is interrupted, git history still matches what was attempted on prod.

- [ ] **Step 4: Apply the migration to prod via Supabase MCP**

Run via `mcp__plugin_supabase_supabase__apply_migration` with:
- `name`: `client_status_phase`
- `query`: contents of the file (copy from Step 1)

Expected output: 3 `NOTICE` lines (2-row, 1-row, 1-row). No errors.

If an `EXCEPTION` is raised ("expected X rows, got Y") — STOP. The transaction has aborted. Investigate slug drift (run `select slug, status from public.clients`) and either fix the slugs in prod or fix the migration file before re-applying.

- [ ] **Step 5: Verify column state**

Run via `mcp__plugin_supabase_supabase__execute_sql`:
```sql
select slug, status, phase, metadata ? 'project_plan' as has_override
  from public.clients order by slug;
```

Expected rows (at minimum):
- `arinya` → active, delivery, has_override=false (unless admin added one)
- `bossler-most` → prospect, discovery, has_override=false
- `gr8progress` → active, delivery, has_override=false

### Task 2: Regenerate types

**Files:**
- Modify: `packages/portal/src/lib/database.types.ts`

- [ ] **Step 1: Regenerate TypeScript types from the updated schema**

Run via `mcp__plugin_supabase_supabase__generate_typescript_types`. Save the result to `packages/portal/src/lib/database.types.ts` (overwriting the existing file).

- [ ] **Step 2: Verify `phase` and `status` columns appear in the generated types**

Read the first 70 lines of `database.types.ts`. Confirm the `clients.Row` block includes:
```typescript
phase: string
status: string
```

The check constraint isn't reflected — both are typed as `string`. That's expected; narrowing happens at the call site in Task 8.

- [ ] **Step 3: Run type-check to make sure nothing else broke**

```bash
cd packages/portal && pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Amend commit with regenerated types**

```bash
cd /Users/daniel/code/software-crafting-website
git add packages/portal/src/lib/database.types.ts
git commit --amend --no-edit
```

---

## Phase 2: Dashboard Logic + Page Wiring (Commit 2)

### Task 3: Extract plan-building logic to a testable module

Pure refactor. No behavior change. Unit test first verifies the baseline, then subsequent tasks extend.

**Files:**
- Create: `packages/portal/src/lib/dashboard-plan.ts`
- Create: `packages/portal/tests/unit/dashboard-plan.test.ts`
- Modify: `packages/portal/src/components/portal/Dashboard.tsx` (remove extracted code, import from new module)

- [ ] **Step 1: Create the extraction target file**

Create `packages/portal/src/lib/dashboard-plan.ts` with this content (copied from `Dashboard.tsx` lines 9–229, exports added):

```typescript
import type { Deliverable, DeliverableType, Form } from '@/lib/types';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '@/lib/types';

export type StepStatus = 'completed' | 'ready' | 'in_progress' | 'upcoming';
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

export function getDefaultPlan(hasQuestionnaire: boolean): PlanStep[] {
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

export function buildSteps(
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

  return steps;
}
```

- [ ] **Step 2: Write a baseline test to lock current behavior before extending**

Create `packages/portal/tests/unit/dashboard-plan.test.ts`:

```typescript
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
```

- [ ] **Step 3: Remove extracted code from Dashboard.tsx and import**

In `packages/portal/src/components/portal/Dashboard.tsx`, delete by identifier (do NOT use line numbers — the file evolves):

1. **Remove** the existing top imports of `DeliverableType`, `DELIVERABLE_TYPES`, `DELIVERABLE_LABELS` (the rendering code still needs `Deliverable` and `Form` for the Props interface, so KEEP those).
2. **Remove these definitions** (they are now in `dashboard-plan.ts`):
   - `export interface PlanStep` block
   - `type StepStatus` alias
   - `type StepOwner` alias
   - `interface ProjectStep` block
   - `interface StepMeta` block
   - `const STEP_META` object
   - `function getDefaultPlan`
   - `function resolveLabel`
   - `function buildSteps`
3. **KEEP** the `interface Props` block — Dashboard's default export still uses it. It's currently just after `PlanStep`; the `projectPlan?: PlanStep[] | null` field on Props will use the imported `PlanStep` type.
4. **Add** near the top (replacing the removed imports):

```typescript
import type { Deliverable, Form } from '@/lib/types';
import {
  buildSteps,
  type PlanStep,
  type ProjectStep,
  type StepStatus,
  type StepOwner,
  STEP_META,
} from '@/lib/dashboard-plan';
```

5. **Re-export** `PlanStep` so `dashboard/page.tsx` import still works:

```typescript
export type { PlanStep };
```

**Verification after this step:** Run `grep -n "^export\|^interface\|^type\|^function\|^const STEP_META" packages/portal/src/components/portal/Dashboard.tsx`. You should see the `Props` interface still present but no definitions of `PlanStep`, `StepStatus`, `StepOwner`, `ProjectStep`, `StepMeta`, `STEP_META`, `getDefaultPlan`, `resolveLabel`, or `buildSteps`.

- [ ] **Step 4: Run the baseline tests to verify behavior is unchanged**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: both describe blocks pass (4 tests).

- [ ] **Step 5: Type-check the whole portal**

```bash
cd packages/portal && pnpm type-check
```

Expected: no errors.

- [ ] **Step 6: Run the existing full test suite to guard against regression**

```bash
cd packages/portal && pnpm test
```

Expected: all tests pass (including the existing `deliverables.test.ts` + `form-schema.test.ts`).

### Task 4: Add `phase` to `getDefaultPlan`

**Files:**
- Modify: `packages/portal/src/lib/dashboard-plan.ts`
- Modify: `packages/portal/tests/unit/dashboard-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `dashboard-plan.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: 4 new tests fail with `TypeError` or wrong arity (getDefaultPlan currently takes one arg).

- [ ] **Step 3: Update `getDefaultPlan` in `dashboard-plan.ts`**

Replace the existing function:

```typescript
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
```

The default `phase = 'delivery'` keeps the baseline test passing (it calls `getDefaultPlan(true)` without phase).

- [ ] **Step 4: Update `buildSteps` signature to accept and thread `phase`**

Change the signature:
```typescript
export function buildSteps(
  projectPlan: PlanStep[] | null | undefined,
  deliverables: Deliverable[],
  questionnaireFormId: string | null,
  questionnaireStatus: Form['status'] | null,
  queryParam: string,
  phase: Phase = 'delivery',
): ProjectStep[] {
```

Replace the `const plan = projectPlan ?? getDefaultPlan(!!questionnaireFormId);` line with:
```typescript
const plan = projectPlan ?? getDefaultPlan(!!questionnaireFormId, phase);
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: all tests pass (baseline 4 + new 4 = 8).

### Task 5: Handle `next-step` in `buildSteps`

**Files:**
- Modify: `packages/portal/src/lib/dashboard-plan.ts`
- Modify: `packages/portal/tests/unit/dashboard-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `dashboard-plan.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: 4 new tests fail — `next-step` currently falls through to the "else" branch and renders as a generic upcoming step.

- [ ] **Step 3: Add the `next-step` branch in `buildSteps`**

In `dashboard-plan.ts`, modify the inner loop. After the `const isQuestionnaire` and `const isStandardDeliverable` lines, add:

```typescript
const isNextStep = entry.key === 'next-step';
```

Then branch on `isNextStep` BEFORE the existing `if (isQuestionnaire)`:

```typescript
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
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: all tests pass (12 total).

### Task 6: Multi-ready hierarchy (`also-ready` demotion)

**Files:**
- Modify: `packages/portal/src/lib/dashboard-plan.ts`
- Modify: `packages/portal/tests/unit/dashboard-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `dashboard-plan.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: 2 tests fail (the current behavior doesn't know about `also-ready`).

- [ ] **Step 3: Add `'also-ready'` to the StepStatus type**

In `dashboard-plan.ts`, change:
```typescript
export type StepStatus = 'completed' | 'ready' | 'in_progress' | 'upcoming' | 'also-ready';
```

- [ ] **Step 4: Add the demotion pass to `buildSteps` AFTER the existing in_progress auto-infer**

At the very end of `buildSteps`, before `return steps;`, add:

```typescript
// Multi-ready demotion: keep the first 'ready' as-is; later 'ready' steps become 'also-ready'.
// Runs AFTER the in_progress auto-infer so the ordering is deterministic.
let seenReady = false;
for (const step of steps) {
  if (step.status === 'ready') {
    if (seenReady) step.status = 'also-ready';
    else seenReady = true;
  }
}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
cd packages/portal && pnpm test tests/unit/dashboard-plan.test.ts
```

Expected: all tests pass (15 total).

### Task 7: Update `Dashboard.tsx` rendering

**Files:**
- Modify: `packages/portal/src/components/portal/Dashboard.tsx`

- [ ] **Step 1: Add `phase` to Props and thread into `buildSteps`**

At the top of `Dashboard.tsx`, update the `Props` interface:

```typescript
interface Props {
  company: string;
  deliverables: Deliverable[];
  questionnaireFormId: string | null;
  questionnaireStatus: Form['status'] | null;
  clientSlug?: string;
  projectPlan?: PlanStep[] | null;
  phase: 'discovery' | 'delivery';
}
```

In the `Dashboard` default export, accept `phase` and pass it to `buildSteps`:

```typescript
export default function Dashboard({
  company, deliverables, questionnaireFormId, questionnaireStatus,
  clientSlug, projectPlan, phase,
}: Props) {
  const queryParam = clientSlug ? `?client=${clientSlug}` : '';
  const steps = buildSteps(projectPlan, deliverables, questionnaireFormId, questionnaireStatus, queryParam, phase);
  // ... rest unchanged
```

- [ ] **Step 2: Add a StepRow branch for `also-ready`**

In `StepRow`, after the `completed` branch and before the `upcoming` branch (the final return), add:

```typescript
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
```

- [ ] **Step 3: Update `StepDot` to handle `also-ready`**

In `StepDot`, after the `ready` branch, add:

```typescript
if (status === 'also-ready') {
  return (
    <div className="w-7 h-7 rounded-full bg-primary/5 border-2 border-primary/40 flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
    </div>
  );
}
```

- [ ] **Step 4: Give `StatusSummary` a `phase` prop with phase-aware copy**

(The old "Step 4: Update StatusPill" was removed — `also-ready` has its own StepRow branch and never reaches StatusPill, so adding an unreachable branch there was dead code. If totality checking is desired later, prefer a `never`-typed exhaustiveness guard inside StatusPill.)

Replace the entire `StatusSummary` component:

```typescript
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
```

- [ ] **Step 5: Update the StatusSummary call site in Dashboard**

Replace:
```typescript
<StatusSummary steps={steps} completedCount={completedCount} isFirstVisit={isFirstVisit} />
```

With:
```typescript
<StatusSummary
  steps={steps}
  completedCount={completedCount}
  isFirstVisit={isFirstVisit}
  phase={phase}
  questionnaireStatus={questionnaireStatus}
/>
```

- [ ] **Step 6: Type-check**

```bash
cd packages/portal && pnpm type-check
```

Expected: no errors.

### Task 8: Wire `phase` into `dashboard/page.tsx`

**Files:**
- Modify: `packages/portal/src/app/dashboard/page.tsx`

- [ ] **Step 1: Extend the SELECT to include `phase`**

In `dashboard/page.tsx`, change line ~57:

```typescript
let clientQuery = supabase.from('clients').select('id, company, slug, metadata, phase');
```

- [ ] **Step 2: Update the cast type and narrow phase at call site**

Replace the existing cast block (around line 76) and the Dashboard call (around lines 90-103):

```typescript
const client = clientData as {
  id: string;
  company: string;
  slug: string;
  metadata: { project_plan?: PlanStep[] } | null;
  phase: string;
};

// Narrow DB string to union. Check constraint currently limits values to
// 'discovery' | 'delivery', but we match each value explicitly so that any
// future addition (e.g., 'paused-delivery') logs loudly instead of collapsing
// silently to 'discovery'. Observable via server logs / Sentry.
let phase: 'discovery' | 'delivery';
if (client.phase === 'delivery') {
  phase = 'delivery';
} else if (client.phase === 'discovery') {
  phase = 'discovery';
} else {
  console.warn(`unexpected client.phase "${client.phase}" for slug=${client.slug}; defaulting to discovery`);
  phase = 'discovery';
}

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
    phase={phase}
    projectPlan={
      Array.isArray(client.metadata?.project_plan)
        ? client.metadata.project_plan.filter((s: PlanStep) => typeof s?.key === 'string')
        : null
    }
  />
);
```

- [ ] **Step 3: Add a docstring above the page component**

At the top of `dashboard/page.tsx` (before the `import` statements), add:

```typescript
/**
 * Dashboard page — phase-driven rendering.
 *
 * Reads `phase` from the clients table and passes it to the Dashboard
 * component. Default plan behavior:
 *   - phase = 'discovery' → questionnaire + next-step row only
 *   - phase = 'delivery'  → full pipeline (analysis → proposal)
 *
 * `metadata.project_plan` overrides the phase default — admin-curated
 * plans render verbatim. See spec 2026-04-16-phase-driven-timeline-design.md.
 */
```

- [ ] **Step 4: Type-check**

```bash
cd packages/portal && pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
cd packages/portal && pnpm test
```

Expected: all unit tests pass (including the new 15 in `dashboard-plan.test.ts`).

- [ ] **Step 6: Start the dev server and spot-check visually**

```bash
cd packages/portal && pnpm dev
```

Open `http://localhost:3001/portal/dashboard?client=bossler-most` (as admin). Confirm:
- Only **Fragebogen** + **Nächste Schritte** visible
- No analysis / mood-board / brand-guide / website-preview / proposal
- StatusSummary reads "Fragebogen offen — ca. 10 Min." (or "Antworten erhalten" if completed)

Open `http://localhost:3001/portal/dashboard?client=arinya`. Confirm:
- Full pipeline still visible
- If Arinya has 2+ `ready` deliverables, only the first is emphasized; later ones render as "Auch schon offen: X →" rows

- [ ] **Step 7: Commit the whole Phase 2**

```bash
cd /Users/daniel/code/software-crafting-website
git add packages/portal/src/lib/dashboard-plan.ts \
        packages/portal/src/components/portal/Dashboard.tsx \
        packages/portal/src/app/dashboard/page.tsx \
        packages/portal/tests/unit/dashboard-plan.test.ts
git commit -m "feat(portal): phase-driven timeline with multi-ready hierarchy"
```

---

## Phase 3: Agency Skill Update (Commit 3)

### Task 9: Add `lead → prospect` flip to `/invite`

**Files:**
- Modify: `~/code/local-web-agency/.claude/skills/invite/SKILL.md`

- [ ] **Step 1: Read the current skill file**

Confirm Step 6 (form status update) is present around line 92.

- [ ] **Step 2: Add a new Step 6b right after Step 6**

Insert after the existing "Step 6: Update form status" block:

```markdown
### Step 6b: Flip client status to `prospect` (idempotent)

```sql
UPDATE clients SET status = 'prospect'
  WHERE id = '{client_id}' AND status = 'lead'
```

Guard on `status = 'lead'` keeps the update idempotent — re-running `/invite` won't regress an already-active client. The flip is cosmetic (drives CRM filtering in Supabase Studio), not behavior-gating.
```

- [ ] **Step 3: Update the skill's "What It Does" overview and "Idempotency" section**

In the "Idempotency" section, add a bullet:
```markdown
- `UPDATE clients SET status = 'prospect'` is guarded by `status = 'lead'` — no regression on re-run
```

- [ ] **Step 4: Commit**

```bash
cd /Users/daniel/code/local-web-agency
git add .claude/skills/invite/SKILL.md
git commit -m "feat(agency): /invite flips status lead→prospect"
```

---

## Phase 4: Documentation (Commit 4)

### Task 10: Add "Client Lifecycle" section to agency CLAUDE.md

**Files:**
- Modify: `~/code/local-web-agency/CLAUDE.md`

- [ ] **Step 1: Locate the right insertion point**

Open `~/code/local-web-agency/CLAUDE.md`. Find the existing "Pipeline Skills" section (around the table of skills, line ~54).

- [ ] **Step 2: Add the section right after the pipeline skills table**

Insert this new section:

```markdown
## Client Lifecycle

Each client in Supabase has two state fields that drive the portal UX:

| Field | Values | Meaning |
|---|---|---|
| `status` | `lead` \| `prospect` \| `active` \| `paused` \| `churned` | Where they are in the sales funnel |
| `phase` | `discovery` \| `delivery` | What kind of dashboard view they see |

### Transitions

| From → To | Trigger | Mechanism |
|---|---|---|
| (new) → `lead, discovery` | `/new-client`, manual INSERT | DB defaults |
| `lead` → `prospect` | `/invite` sends the magic link | Automatic in the skill |
| `prospect` → `active`, `discovery` → `delivery` | Contract signed | Manual for now — run the SQL below in Supabase Studio |
| `active` → `paused` \| `churned` | Manual | Supabase Studio |

### SQL cheatsheet

```sql
-- Contract signed: flip to active delivery
UPDATE clients
  SET status = 'active', phase = 'delivery'
  WHERE slug = '{slug}';

-- Pause (project on hold)
UPDATE clients SET status = 'paused' WHERE slug = '{slug}';

-- Churn (client won't proceed)
UPDATE clients SET status = 'churned' WHERE slug = '{slug}';
```

### Drift signals

- `status = 'active'` but `phase = 'discovery'` — likely forgot to flip phase after signing
- `status = 'lead'` but questionnaire is `completed` — likely forgot to run `/invite` before the client found the link

Neither is enforced at the DB layer; treat as hints during admin review.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/daniel/code/local-web-agency
git add CLAUDE.md
git commit -m "docs(agency): client lifecycle + phase-flip runbook"
```

---

## Deploy Order

1. **Apply migration to prod** (already done in Phase 1 Task 1 Step 2 via MCP — both schema and backfill are now on prod)
2. **Push Phase 2 code to main** — CI deploys portal; Dashboard now reads `phase`
3. **Push Phase 3 skill change** — next `/invite` will flip status
4. **Push Phase 4 docs** — reference material

The migration was applied to prod in Phase 1. Phase 2 code assumes the column exists — confirmed by type-check against the regenerated types. Between migration apply (done) and Phase 2 deploy, Bossler sees the old full-pipeline default (override was cleared, no phase logic in prod yet) — acceptable brief regression.

---

## Verification Checklist

After all phases ship:

- [ ] `bossler-most` dashboard shows only Fragebogen + Nächste Schritte (via admin preview)
- [ ] `arinya` dashboard shows full pipeline with multi-ready demotion if applicable
- [ ] Running `/invite` on a `lead` client flips them to `prospect` in Supabase
- [ ] Flipping `bossler-most` phase to `delivery` in Supabase Studio makes the full pipeline appear
- [ ] Flipping back to `discovery` collapses to questionnaire + next-step
- [ ] `pnpm test` passes
- [ ] `pnpm type-check` passes

---

## Appendix A: Rollback Procedure

Use this procedure if Phase 2 is abandoned or the new dashboard rendering causes a visible regression that cannot be patched forward.

### Prerequisites

- The snapshot file `docs/superpowers/plans/2026-04-18-phase-driven-timeline-rollback.md` must exist (produced in Phase 1 Task 1 Step 2). If missing, Bossler's `project_plan` cannot be restored without reconstructing it manually.

### Steps

1. **Restore Bossler's `project_plan`:**

```sql
-- Replace <SNAPSHOT_JSON> with the JSON value recorded in the snapshot file.
-- If the snapshot recorded `null`, use: set metadata = metadata - 'project_plan'
update public.clients
  set metadata = jsonb_set(metadata, '{project_plan}', '<SNAPSHOT_JSON>'::jsonb)
  where slug = 'bossler-most';
```

2. **Revert the portal code** (if Phase 2 was already merged): `git revert <phase-2-commit-sha>` and redeploy.

3. **Drop the new columns** (optional — leave them if you plan to retry):

```sql
alter table public.clients
  drop column if exists phase,
  drop column if exists status;
```

4. **Verify:**

```sql
select slug, metadata ? 'project_plan' as has_override, column_name
  from public.clients
  left join information_schema.columns
    on table_schema='public' and table_name='clients' and column_name in ('phase','status')
  where slug = 'bossler-most'
  group by slug, has_override, column_name;
```

### Why the snapshot matters

Bossler's `project_plan` was admin-curated (includes custom `security-review`, `website-preview: Landingpage-Vorschau`, etc.). Reconstructing it from memory is lossy. The Step 2 snapshot is the only authoritative copy.
