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
