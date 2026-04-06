# Software Crafting Website — Agent Instructions

## What This Is

Portal + public website for software-crafting.de. Astro 6 SSR with Supabase Auth, deployed to Hetzner via GitHub Actions CI/CD.

## Architecture

- **Framework:** Astro 6.1 SSR with `@astrojs/node` adapter
- **Auth:** Supabase Auth via `@supabase/ssr` (cookie-based, large cookies ~3.5KB)
- **Styling:** Tailwind CSS v4 with OKLCH design tokens
- **Portal theme:** Always dark — `.portal-page` class on body remaps standard Tailwind classes (e.g. `bg-white` → dark card, `text-teal-700` → purple accent). Write portal components using standard Tailwind classes, NOT dark: variants.
- **React components:** Portal interactive components are `.tsx` React files
- **DB:** Supabase (tables: `clients`, `deliverables`, `forms`, `responses`, `user_roles`)

## Portal: Client Dashboard

The client dashboard (`/portal/dashboard`) shows a **vertical timeline** of project steps. Each step has a status: `completed`, `ready`, `in_progress`, or `upcoming`.

### Per-Client Project Plan

Each client can have a custom `project_plan` in their `metadata` JSON column (Supabase `clients` table). This controls which steps appear, in what order, and with what labels.

**Schema:** `client.metadata.project_plan` is an array of `PlanStep`:

```typescript
interface PlanStep {
  key: string;              // deliverable type, 'questionnaire', or custom key
  label?: string;           // override default label (e.g. "Landingpage-Vorschau" instead of "Website-Vorschau")
  icon?: string;            // override default icon emoji
  status?: StepStatus;      // for CUSTOM steps only: 'completed' | 'ready' | 'in_progress' | 'upcoming'
  description?: string;     // override auto-generated description text
  href?: string;            // for custom steps: link target
}
```

**How status is determined:**
- `key === 'questionnaire'` → auto-detected from `forms` table (sent/in_progress/completed)
- `key` matches a deliverable type (`analysis`, `mood-board`, `brand-guide`, `website-preview`, `proposal`) → auto-detected from `deliverables` table (published/viewed)
- Custom key (anything else) → uses `status` from the plan entry (default: `upcoming`)
- Auto-inferred `in_progress`: the first `upcoming` step after a `completed` step gets promoted

**Example plan (bossler-most):**
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
1. Build with pnpm
2. rsync to both `/var/www/software-crafting/` and `/var/www/software-crafting-preview/`
3. PM2 restart both processes
4. Health check (curl localhost)

**CRITICAL:** rsync uses `--exclude='client/preview/'` to preserve client preview symlinks.

### Server

- **Host:** Hetzner CAX11, 178.104.50.249
- **SSH:** `deploy` user, key `~/.ssh/software-crafting-deploy`
- **PM2 processes:** `software-crafting` (port 4321), `software-crafting-preview` (port 4322)
- **nginx:** proxies to `http://[::1]:4321` (IPv6!), `large_client_header_buffers 4 32k` for Supabase cookies
- **Preview symlinks:** `/var/www/software-crafting-preview/dist/client/preview/{slug}` → `/var/www/portal-assets/{slug}/website-preview/`

### Manual Deploy

```bash
rsync -avz --delete --exclude='client/preview/' dist/ deploy@178.104.50.249:/var/www/software-crafting-preview/dist/ -e "ssh -i ~/.ssh/software-crafting-deploy"
ssh -i ~/.ssh/software-crafting-deploy deploy@178.104.50.249 "cd /var/www/software-crafting-preview && pm2 restart software-crafting"
```

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/portal/dashboard.astro` | Dashboard page (admin overview + client view routing) |
| `src/components/portal/Dashboard.tsx` | Client timeline component |
| `src/components/portal/AdminDashboard.tsx` | Admin overview component |
| `src/lib/types.ts` | Deliverable, Form, Client types + constants |
| `src/lib/deliverables.ts` | File reading from portal-assets directory |
| `src/pages/portal/deliverables/[...path].astro` | Deliverable viewer (markdown, PDF, iframe, srcdoc) |
| `src/styles/global.css` | OKLCH design tokens + .portal-page dark theme overrides |
| `src/layouts/PortalLayout.astro` | Portal layout (applies portal-page class) |

## Known Gotchas

- **Astro on Linux binds IPv6:** `host: 'localhost'` → `[::1]:4321`, not `127.0.0.1`. nginx proxy_pass must use `http://[::1]:4321`
- **Supabase cookies are large:** ~3.5KB base64. nginx needs `large_client_header_buffers 4 32k`
- **rsync --delete kills symlinks:** ALWAYS use `--exclude='client/preview/'` when deploying
- **iframe auth issues:** Don't use iframe `src` for auth-protected content. Use `srcdoc` with inlined base64 assets instead
