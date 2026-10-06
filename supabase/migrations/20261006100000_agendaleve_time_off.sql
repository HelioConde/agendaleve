create table if not exists public.agendaleve_time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.agendaleve_businesses(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  constraint agendaleve_time_off_range_check check (ends_on >= starts_on),
  constraint agendaleve_time_off_label_check check (char_length(label) <= 80)
);

create index if not exists agendaleve_time_off_business_range_idx
  on public.agendaleve_time_off (business_id, starts_on, ends_on);

alter table public.agendaleve_time_off enable row level security;

revoke all on table public.agendaleve_time_off from anon;
revoke all on table public.agendaleve_time_off from authenticated;
grant select, insert, delete on table public.agendaleve_time_off to authenticated;

drop policy if exists agendaleve_time_off_owner_select on public.agendaleve_time_off;
create policy agendaleve_time_off_owner_select
on public.agendaleve_time_off
for select
to authenticated
using (
  exists (
    select 1
    from public.agendaleve_businesses b
    where b.id = business_id
      and b.owner_id = (select auth.uid())
  )
);

drop policy if exists agendaleve_time_off_owner_insert on public.agendaleve_time_off;
create policy agendaleve_time_off_owner_insert
on public.agendaleve_time_off
for insert
to authenticated
with check (
  exists (
    select 1
    from public.agendaleve_businesses b
    where b.id = business_id
      and b.owner_id = (select auth.uid())
  )
);

drop policy if exists agendaleve_time_off_owner_delete on public.agendaleve_time_off;
create policy agendaleve_time_off_owner_delete
on public.agendaleve_time_off
for delete
to authenticated
using (
  exists (
    select 1
    from public.agendaleve_businesses b
    where b.id = business_id
      and b.owner_id = (select auth.uid())
  )
);
