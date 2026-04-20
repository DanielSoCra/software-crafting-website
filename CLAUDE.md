# Software Crafting Website — Agent Instructions

## What This Is

Portal + public website for software-crafting.de. pnpm monorepo with two apps: Astro public website and Next.js client portal. Deployed to Hetzner via GitHub Actions CI/CD.

## Architecture

**Monorepo structure (pnpm workspaces):**

```
packages/
├── website/       # @portal/website — Astro 6 SSR public site (port 4321)
└── portal/        # @portal/portal — Next.js 15 client portal (port 4322)
```

- **Public website:** Astro 6.1 SSR with `@astrojs/node` adapter
- **Client portal:** Next.js 15 App Router with `output: 'standalone'`, basePath `/portal`
- **Auth:** Supabase Auth via `@supabase/ssr` (cookie-based, large cookies ~3.5KB)
- **Styling:** Tailwind CSS v4 — website uses OKLCH design tokens, portal uses dark theme
- **Portal theme:** Always dark. Portal components use standard Tailwind classes.
- **DB:** Supabase (tables: `clients`, `deliverables`, `forms`, `responses`, `user_roles`)
- **Routing:** nginx routes `/portal/*` to Next.js (port 4322), everything else to Astro (port 4321)

## Portal: Client Dashboard

The client dashboard (`/portal/dashboard`) shows a **vertical timeline** of project steps. Each step has a status: `completed`, `ready`, `in_progress`, `upcoming`, or `also-ready` (see multi-ready hierarchy below). The dashboard also branches on a `phase` field on the client row — see "Phase-Driven Rendering" below.

### Per-Client Project Plan

Each client can have a custom `project_plan` in their `metadata` JSON column (Supabase `clients` table). This controls which steps appear, in what order, and with what labels.

**Schema:** `client.metadata.project_plan` is an array of `PlanStep`:

```typescript
interface PlanStep {
  key: string;              // deliverable type, 'questionnaire', or custom key
  label?: string;           // override default label (e.g. "Landingpage-Vorschau" instead of "Website-Vorschau")
  icon?: string;            // override default icon emoji
  status?: StepStatus;      // for CUSTOM steps only: 'completed' | 'ready' | 'in_progress' | 'upcoming' | 'also-ready'
  description?: string;     // override auto-generated description text
  href?: string;            // for custom steps: link target
}
```

**How status is determined:**
- `key === 'questionnaire'` → auto-detected from `forms` table (sent/in_progress/completed)
- `key` matches a deliverable type (`analysis`, `mood-board`, `brand-guide`, `website-preview`, `proposal`) → auto-detected from `deliverables` table (published/viewed)
- Custom key (anything else) → uses `status` from the plan entry (default: `upcoming`)
- Auto-inferred `in_progress`: the first `upcoming` step after a `completed` step gets promoted
- **Multi-ready demotion:** when multiple steps would be `ready`, only the first stays `ready`; subsequent ones become `also-ready` (quiet "Auch schon offen: X →" row rather than an emphasized card). Applied after the `in_progress` auto-infer.
- **Synthetic `next-step` row:** the key `'next-step'` is NOT in `deliverables` — it's a discovery-phase-only placeholder. Hidden when no form exists or form is draft/published; `upcoming` when sent/in_progress; `in_progress` (no CTA) when completed. It locks out auto-infer, so it never gets promoted by other rules.

**Example plan (historical, bossler-most pre-2026-04-19 migration — retained as a schema reference):**
```json
{
  "project_plan": [
    {"key": "security-review", "label": "Security Review", "icon": "🔒", "status": "completed", "description": "Sicherheitsanalyse Ihrer aktuellen Website abgeschlossen."},
    {"key": "analysis", "label": "Website-Einschätzung", "description": "Erste Einschätzung Ihrer aktuellen Website."},
    {"key": "mood-board"},
    {"key": "website-preview", "label": "Landingpage-Vorschau"},
    {"key": "questionnaire"},
    {"key": "brand-guide"},
    {"key": "proposal"}
  ]
}
```

**No plan → default pipeline:** questionnaire (if form exists) → analysis → mood-board → brand-guide → website-preview → proposal.

**Phase-driven default plan:** `clients.phase` (either `'discovery'` or `'delivery'`) changes the default plan when `project_plan` is null. Discovery renders `[questionnaire, next-step]` (minimum-viable pre-contract UX — no delivery steps shown). Delivery renders the full pipeline above. An explicit `project_plan` always wins over the phase default. See the spec at `docs/superpowers/specs/2026-04-16-phase-driven-timeline-design.md` and the agency repo's `CLAUDE.md` "Client Lifecycle" section for transitions.

### Deliverable Types

Defined in `src/lib/types.ts`:

| Type | German Label | Served From |
|------|-------------|-------------|
| `analysis` | Analyse | `/var/www/portal-assets/{slug}/analysis/` |
| `mood-board` | Mood Board | `/var/www/portal-assets/{slug}/mood-board/` |
| `brand-guide` | Brand Guide | `/var/www/portal-assets/{slug}/brand-guide/` |
| `website-preview` | Website-Vorschau | `/var/www/portal-assets/{slug}/website-preview/` |
| `proposal` | Angebot | `/var/www/portal-assets/{slug}/proposal/` |

### Admin Dashboard

Admin users (role in `user_roles` table) see `/portal/dashboard` as an overview of all clients with:
- Dot-matrix pipeline status per client
- Alerts for unviewed deliverables >48h and unanswered forms >48h
- Click client → drill into their dashboard with `?client={slug}`

## Portal: Website Preview

Website previews use `srcdoc` with base64-inlined assets to avoid nested auth issues in iframes. The `[...path].astro` route reads HTML from disk, replaces `src="assets/..."` with `data:` URIs, and sets `srcdoc` on the iframe. Includes Desktop/Tablet/Mobile device switcher.

## Deployment

### CI/CD (GitHub Actions)

Push to `main` triggers `.github/workflows/deploy.yml`:
1. Build Astro website: `pnpm --filter @portal/website build`
2. Build Next.js portal: `pnpm --filter @portal/portal build`
3. rsync Astro to `/var/www/software-crafting/dist/` (with `--exclude='client/preview/'`)
4. rsync Next.js standalone to `/var/www/software-crafting-portal/`
5. rsync Next.js static assets to `/var/www/software-crafting-portal/.next/static/`
6. PM2 restart both processes
7. Health check both endpoints

**CRITICAL:** Astro rsync uses `--exclude='client/preview/'` to preserve client preview symlinks.

### Server

- **Host:** Hetzner CAX11, 178.104.50.249
- **SSH:** `deploy` user, key `~/.ssh/software-crafting-deploy`
- **PM2 processes:**
  - `software-crafting` (port 4321) — Astro public website at `/var/www/software-crafting/`
  - `software-crafting-portal` (port 4322) — Next.js portal at `/var/www/software-crafting-portal/`
- **nginx:** routes `/portal/*` to `http://[::1]:4322`, everything else to `http://[::1]:4321`. `large_client_header_buffers 4 32k` for Supabase cookies. See `docs/nginx-portal.conf` for portal-specific blocks.
- **Portal assets:** `/var/www/portal-assets/{slug}/` — deliverable files served by the portal

### Manual Deploy

```bash
# Astro website
rsync -avz --delete --exclude='client/preview/' packages/website/dist/ deploy@178.104.50.249:/var/www/software-crafting/dist/ -e "ssh -i ~/.ssh/software-crafting-deploy"
ssh -i ~/.ssh/software-crafting-deploy deploy@178.104.50.249 "cd /var/www/software-crafting && pm2 restart software-crafting"

# Next.js portal
rsync -avz --delete packages/portal/.next/standalone/ deploy@178.104.50.249:/var/www/software-crafting-portal/ -e "ssh -i ~/.ssh/software-crafting-deploy"
rsync -avz --delete packages/portal/.next/static/ deploy@178.104.50.249:/var/www/software-crafting-portal/.next/static/ -e "ssh -i ~/.ssh/software-crafting-deploy"
ssh -i ~/.ssh/software-crafting-deploy deploy@178.104.50.249 "cd /var/www/software-crafting-portal && pm2 restart software-crafting-portal"
```

## Key Files

### Public Website (`packages/website/`)

| File | Purpose |
|------|---------|
| `src/styles/global.css` | OKLCH design tokens |

### Portal (`packages/portal/`)

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout |
| `src/app/login/page.tsx` | Login page (magic link auth) |
| `src/app/dashboard/page.tsx` | Dashboard (admin overview + client timeline) |
| `src/app/deliverables/[...path]/page.tsx` | Deliverable viewer (markdown, PDF, iframe, srcdoc) |
| `src/app/questionnaire/[formId]/page.tsx` | Client questionnaire form |
| `src/app/api/mood-board-feedback/route.ts` | Mood board feedback API |
| `ecosystem.config.cjs` | PM2 config for production |

### Shared

| File | Purpose |
|------|---------|
| `docs/nginx-portal.conf` | nginx config reference for portal reverse proxy |
| `.github/workflows/deploy.yml` | CI/CD: build + deploy both apps |

## Known Gotchas

- **Astro on Linux binds IPv6:** `host: 'localhost'` → `[::1]:4321`, not `127.0.0.1`. nginx proxy_pass must use `http://[::1]:4321`
- **Next.js standalone also binds IPv6:** `HOSTNAME: '::1'` in PM2 config. nginx proxy_pass must use `http://[::1]:4322`
- **Supabase cookies are large:** ~3.5KB base64. nginx needs `large_client_header_buffers 4 32k`
- **rsync --delete kills symlinks:** ALWAYS use `--exclude='client/preview/'` when deploying the Astro website
- **Next.js standalone needs static assets:** After rsync of `.next/standalone/`, must also rsync `.next/static/` into the standalone dir
- **iframe auth issues:** Don't use iframe `src` for auth-protected content. Use `srcdoc` with inlined base64 assets instead
- **Portal basePath:** Next.js is configured with `basePath: '/portal'` — all routes are under `/portal/*`
