# Phase-Driven Portal Timeline

**Date:** 2026-04-16
**Status:** Design — awaiting implementation plan
**Scope:** `packages/portal` (software-crafting-website), `~/code/local-web-agency` (skills + docs)
**Supersedes:** `~/.claude/plans/cozy-petting-parasol.md` (vault-primary architecture — rejected)

---

## Problem

The portal dashboard renders the full delivery pipeline (questionnaire → analysis → mood-board → brand-guide → website-preview → proposal) for every client regardless of their relationship stage. For a prospect who hasn't signed (e.g. Bossler), this reads as sales pressure — "here's what you'll get once you decide" implied against a client who has not decided.

Two specific symptoms:

1. **Content gating missing.** Non-customers see delivery steps they have no claim on yet. Awkward, overreach.
2. **No emphasis hierarchy across multiple ready steps.** When admin publishes two deliverables in parallel, both render as full emphasized cards with primary CTAs. The client doesn't know where to start.

## Architecture context

Before designing the fix, we settled the data-ownership question that was blocking the previous vault-primary plan (`cozy-petting-parasol.md`). That plan is rejected. The new principle:

> The second brain reflects reality; it doesn't run it.

**Hybrid source-of-truth split (target):**

| Data | Target owner | Current owner | Why |
|---|---|---|---|
| Live portal state (`status`, `phase`, `project_plan`) | **Supabase** | Supabase (partial) | Portal renders it; RLS can gate by it; queryable across clients |
| Discovery snapshot (problem, budget, goals, qualification, references, contacts, contract, discovery chain) | **Agency repo `client-profile.yml`** | Vault `_profile.md` | Edited iteratively during discovery; YAML is the best editing surface; git-diff-reviewable |
| Personal pointer (slug, company, relationship, started, tags, agency path) | **Vault `_profile.md`** | Vault `_profile.md` | Obsidian graph + personal annotation; not operational |

**Current state:** The vault-primary architecture from `cozy-petting-parasol.md` was partially implemented — `client-profile.yml` was eliminated and skills read from vault via Obsidian MCP. The target hybrid state requires moving the discovery snapshot back to YAML. That migration will be scoped in a follow-up spec (working title: `restore-client-profile-yml.md`) — not a blocker for this work.

**This spec's scope is orthogonal to discovery data location.** The dashboard reads `phase` from Supabase and deliverables/forms from their own tables; it does not read discovery snapshot data. This spec can land before YAML restoration is done.

**Sync direction (target):** writes flow outward from each owner. Agency → Supabase at pipeline milestones. Agency → Vault at creation. No bi-directional sync.

---

## Design

### 1. Schema

Single migration adds two columns with check constraints and backfills the three existing clients to match their current reality.

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_client_status_phase.sql

alter table public.clients
  add column if not exists status text not null default 'lead'
    check (status in ('lead','prospect','active','paused','churned')),
  add column if not exists phase text not null default 'discovery'
    check (phase in ('discovery','delivery'));

-- Backfill existing clients to current reality + clear discovery overrides
do $$
declare r int;
begin
  update public.clients set status = 'active', phase = 'delivery'
    where slug in ('arinya','gr8progress');
  get diagnostics r = row_count;
  raise notice 'active/delivery backfill: % rows', r;
  if r <> 2 then raise warning 'expected 2, got %', r; end if;

  -- bossler-most: invited, awaiting reply → prospect (not lead)
  update public.clients set status = 'prospect', phase = 'discovery'
    where slug = 'bossler-most';
  get diagnostics r = row_count;
  raise notice 'prospect/discovery backfill: % rows', r;
  if r <> 1 then raise warning 'expected 1, got %', r; end if;

  -- Clear bossler-most's existing project_plan override. His override was
  -- admin-curated aspirationally and includes delivery-phase steps that
  -- shouldn't render during discovery. Clearing lets the phase default take
  -- over. Scoped by slug to avoid clearing demo-client overrides used for
  -- testing (alpinvest, gruenwerk, etc.).
  update public.clients
    set metadata = metadata - 'project_plan'
    where slug = 'bossler-most' and metadata ? 'project_plan';
  get diagnostics r = row_count;
  raise notice 'cleared bossler-most project_plan: % rows', r;
end $$;
```

This is a new migration that stacks on top of the existing `20260402100000_baseline.sql`. Do **not** edit the baseline — fresh projects run baseline → this migration in order and end up at the same state as prod.

**No transition validation at the DB layer.** Check constraints validate current values only; encoding state-machine transitions in SQL is more overhead than signal. Admin trust; if they set the wrong thing, fix in Studio. Adding a new status value later requires a follow-up `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` — acceptable tax for enforcement.

**RLS:** unchanged. Existing policies operate on `id` / `user_id` joins; new columns are read through the same selects.

**Types:** regenerate `packages/portal/src/lib/database.types.ts` via `supabase gen types` after the migration applies.

### 2. Rendering rules

#### 2a. Default `project_plan` by phase

When `client.metadata.project_plan` is absent, `Dashboard.tsx` derives the plan from `phase`:

```
phase = discovery → [questionnaire (if form exists), next-step]
phase = delivery  → [questionnaire (if form exists; status auto-derived),
                     analysis, mood-board, brand-guide, website-preview,
                     proposal]
```

**Edge case — discovery, no form yet:** plan resolves to `[next-step]`, and next-step is hidden per §2b when no form. Dashboard would render empty. This is a transient admin-side state (client created but questionnaire not yet generated via `/questionnaire`) — resolves as soon as a form is created. Acceptable; no special handling needed.

`project_plan` override precedence: **override always wins**. If admin sets `metadata.project_plan = [...]`, it renders verbatim regardless of phase. This is the escape hatch for non-standard clients.

#### 2b. The `next-step` row (discovery only)

`next-step` is a synthetic, non-deliverable row. It is not in `STEP_META`. Its rendering is a function of questionnaire status:

| Questionnaire status | `next-step` rendered as |
|---|---|
| no form / not sent | hidden (only questionnaire visible) |
| `sent`, not started | upcoming, muted: "Nach deinen Antworten melden wir uns mit einem Angebot." |
| `in_progress` | upcoming, muted: same copy |
| `completed` | in-progress card, no CTA: "Danke! Wir melden uns in 2–3 Tagen mit einem Angebot." |

The row never becomes `ready` (no CTA), because the next action belongs to the agency, not the client.

#### 2c. Multi-ready hierarchy (delivery only)

`buildSteps` gets a post-processing pass. After computing all step statuses:

1. Walk the step list in order.
2. The first `ready` step keeps `ready` (emphasized card + primary CTA).
3. Every subsequent `ready` step is demoted to a new status `also-ready`.

A new `StepRow` branch renders `also-ready` as a compact single-line row:

```
Auch schon offen: Mood Board →
```

Quiet link (`text-primary hover:underline`), no card, no duration, no description. Discoverable but unambiguous about where to start.

Completed and upcoming rendering: unchanged.

**Order of operations:** apply the `also-ready` demotion AFTER the existing "first `upcoming` after `completed` → `in_progress`" auto-infer (lines 214-226 in current `Dashboard.tsx`). Both orderings yield equivalent results for the current rule set; documenting fixes the order if rules change.

#### 2d. `StatusSummary` banner

Discovery phase shows a single line: "Fragebogen offen — ca. 10 Min." or "Antworten erhalten — wir melden uns." No "Offen für dich / In Arbeit" split in discovery, since there's at most one client-owned action.

Delivery phase: existing split ("Offen für dich" + "In Arbeit") is retained, but "Offen für dich" now lists only the emphasized step (not the also-ready ones — they're visible in the timeline itself).

#### 2e. `Dashboard.tsx` changes summary

- `dashboard/page.tsx`: SELECT extends to `id, company, slug, metadata, phase` and passes `phase` as a new Dashboard prop. Narrow the DB string to a union: `const phase = client.phase === 'delivery' ? 'delivery' : 'discovery';` (TS types from `supabase gen types` don't reflect check constraints)
- `Props` gains `phase: 'discovery' | 'delivery'`
- `getDefaultPlan` takes `phase` and `hasQuestionnaire`, returns the discovery or delivery template
- `buildSteps` recognizes the `next-step` key and renders it per table in §2b
- `StepStatus` type extends to include `'also-ready'`
- New `StepRow` branch for `also-ready`
- `StatusSummary` accepts `phase` prop; copy and layout differ between phases (§2d)

No changes to `AdminDashboard.tsx`. The admin pipeline grid is orthogonal — it always shows all six deliverable columns regardless of phase.

### 3. Sync points

| Transition | Trigger | Mechanism |
|---|---|---|
| (new) → `status=lead, phase=discovery` | `/new-client`, manual INSERT | DB defaults, no code |
| `lead` → `prospect` | `/invite` sends magic link | Skill: `update clients set status='prospect' where slug=$1 and status='lead'` (idempotent) |
| `prospect` → `active`, `discovery` → `delivery` | contract signed | Manual SQL via Supabase Studio (for now) |
| `active` → `paused` / `churned` | manual | Supabase Studio |

The `lead → prospect` flip in `/invite` is a small addition to the existing skill — only one SQL update, guarded on current status. It doesn't gate any behavior, it just makes CRM filtering in Studio more useful.

The `prospect → active` + phase flip is the business-meaningful transition. Manual-for-now is deliberate: a `/activate-client` skill is easy to add later once we know what it should also do (e.g., send a welcome email, move questionnaire to archive, etc.).

### 4. Documentation

- `packages/portal/src/app/dashboard/page.tsx`: docstring noting phase-driven rendering and override precedence
- `~/code/local-web-agency/CLAUDE.md`: new "Client Lifecycle" section documenting states, transitions, and SQL cheatsheet for phase flips

### 5. Testing

**Unit (`packages/portal/tests/unit/`):**
- `dashboard-plan.test.ts` (new): `buildSteps` with each phase + questionnaire status combination; multi-ready hierarchy assertion (first emphasized, rest `also-ready`); `project_plan` override wins over phase default
- `next-step.test.ts` (new or merged): `next-step` row rendering across all four questionnaire states

**E2E:** skipped in this spec. `playwright.config.ts` targets `https://software-crafting.de`; a phase-flip E2E would mutate prod state and require admin auth in CI. Unit tests cover the rendering logic. If read-only E2E coverage is wanted later, seed a permanent `demo-discovery` and `demo-delivery` client with stable phase and assert their rendered views.

**Manual:**
- Apply migration, flip `bossler-most` phase in Supabase Studio, refresh portal, confirm view changes (full pipeline appears)
- Flip back to `discovery`, confirm the dashboard shrinks: delivery steps disappear; questionnaire persists (as completed if submitted); `next-step` row re-appears

### 6. Commits

1. `feat(portal): add status + phase columns + clear discovery overrides` — migration + types regen
2. `feat(portal): phase-driven timeline with multi-ready hierarchy` — Dashboard.tsx + dashboard/page.tsx + tests
3. `feat(agency): /invite flips status lead→prospect` — skill change
4. `docs(agency): client lifecycle + phase-flip runbook` — CLAUDE.md updates

**Deploy ordering:** apply the migration (commit 1) to prod BEFORE deploying the code (commit 2). Otherwise the dashboard SELECT fails on the missing `phase` column. Window between the two: Bossler sees the old full-pipeline default (override cleared, no phase logic yet) — acceptable brief regression.

---

## Non-goals / deferred

- **Restoring `client-profile.yml` to the agency repo.** Separate spec. This spec is orthogonal — Dashboard does not read discovery snapshot data. Skills that currently read vault via MCP continue to do so until YAML restoration lands.
- **Cleaning up vault operational writes in skills.** `/invite` writes `invite_sent`, `discovery_next_step`, and Supabase IDs to vault. Under the target hybrid model those become mirror writes. Cleanup deferred to a separate spec.
- **Vault sync.** Mirroring `status` from Supabase to `_profile.md` so it's visible in Obsidian — separate skill, not blocking.
- **Admin UI for phase flips.** Supabase Studio is adequate for now. Revisit when there are enough clients to make Studio tedious.
- **`/activate-client` skill.** Deferred until we know what "activating" means beyond the phase flip.
- **`AdminDashboard.tsx` rework.** The admin pipeline grid already shows all six deliverable columns — that's its job. Orthogonal to this change.
- **Transition validation at DB.** Trust the admin. The state machine lives in skills and documentation, not schema.

## Open questions

None.

## Risks

- **Phase flip is manual.** If admin forgets to flip `phase=delivery` after signing a contract, the delivery-phase client still sees the discovery view. Mitigation: document in lifecycle runbook; consider surfacing a reminder in `AdminDashboard.tsx` (a client with `status=active, phase=discovery` is a drift signal).
- **`also-ready` rendering could be missed by non-technical users** if too quiet. Mitigation: verify visually with Arinya's mother or similar test user; adjust contrast if it reads as disabled.
- **Backfill UPDATEs depend on current slugs.** If a slug has changed since this spec was written, the UPDATE won't match. Mitigation: the DO block in §1 emits `RAISE NOTICE`/`WARNING` on unexpected row counts. Verify migration output before deploying.
