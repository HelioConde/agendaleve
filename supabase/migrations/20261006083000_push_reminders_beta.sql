create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.agendaleve_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, endpoint)
);

alter table public.agendaleve_push_subscriptions enable row level security;

drop policy if exists "AgendaLeve owners read push subscriptions" on public.agendaleve_push_subscriptions;
create policy "AgendaLeve owners read push subscriptions"
on public.agendaleve_push_subscriptions
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "AgendaLeve owners insert push subscriptions" on public.agendaleve_push_subscriptions;
create policy "AgendaLeve owners insert push subscriptions"
on public.agendaleve_push_subscriptions
for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "AgendaLeve owners update push subscriptions" on public.agendaleve_push_subscriptions;
create policy "AgendaLeve owners update push subscriptions"
on public.agendaleve_push_subscriptions
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "AgendaLeve owners delete push subscriptions" on public.agendaleve_push_subscriptions;
create policy "AgendaLeve owners delete push subscriptions"
on public.agendaleve_push_subscriptions
for delete to authenticated
using (owner_id = (select auth.uid()));

revoke all privileges on table public.agendaleve_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.agendaleve_push_subscriptions to authenticated;

create table if not exists public.agendaleve_reminder_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  push_enabled boolean not null default true,
  reminder_minutes integer[] not null default array[1440,120]::integer[],
  updated_at timestamptz not null default now(),
  constraint agendaleve_reminder_minutes_check
    check (
      cardinality(reminder_minutes) between 1 and 2
      and reminder_minutes <@ array[120,1440]::integer[]
    )
);

alter table public.agendaleve_reminder_preferences enable row level security;

drop policy if exists "AgendaLeve owners read reminder preferences" on public.agendaleve_reminder_preferences;
create policy "AgendaLeve owners read reminder preferences"
on public.agendaleve_reminder_preferences
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "AgendaLeve owners insert reminder preferences" on public.agendaleve_reminder_preferences;
create policy "AgendaLeve owners insert reminder preferences"
on public.agendaleve_reminder_preferences
for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "AgendaLeve owners update reminder preferences" on public.agendaleve_reminder_preferences;
create policy "AgendaLeve owners update reminder preferences"
on public.agendaleve_reminder_preferences
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

revoke all privileges on table public.agendaleve_reminder_preferences from public, anon, authenticated;
grant select, insert, update on table public.agendaleve_reminder_preferences to authenticated;

create table if not exists public.agendaleve_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.agendaleve_bookings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reminder_minutes integer not null check (reminder_minutes in (120,1440)),
  channel text not null default 'push' check (channel in ('push')),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempted_at timestamptz,
  sent_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique (booking_id, reminder_minutes, channel)
);

alter table public.agendaleve_reminder_deliveries enable row level security;

drop policy if exists "AgendaLeve owners read reminder deliveries" on public.agendaleve_reminder_deliveries;
create policy "AgendaLeve owners read reminder deliveries"
on public.agendaleve_reminder_deliveries
for select to authenticated
using (owner_id = (select auth.uid()));

revoke all privileges on table public.agendaleve_reminder_deliveries from public, anon, authenticated;
grant select on table public.agendaleve_reminder_deliveries to authenticated;

create index if not exists agendaleve_reminder_deliveries_owner_created_idx
  on public.agendaleve_reminder_deliveries (owner_id, created_at desc);

create table if not exists public.agendaleve_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.agendaleve_businesses(id) on delete set null,
  role text not null check (role in ('owner','client')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  context text not null default 'general',
  created_at timestamptz not null default now(),
  constraint agendaleve_feedback_comment_length check (comment is null or char_length(comment) <= 1000)
);

alter table public.agendaleve_feedback enable row level security;
revoke all privileges on table public.agendaleve_feedback from public, anon, authenticated;

create index if not exists agendaleve_feedback_created_idx
  on public.agendaleve_feedback (created_at desc);

create table if not exists public.agendaleve_product_events (
  id bigint generated by default as identity primary key,
  business_id uuid references public.agendaleve_businesses(id) on delete set null,
  session_hash text not null,
  role text not null check (role in ('owner','client')),
  event_name text not null check (
    event_name in (
      'page_view','booking_started','booking_created','booking_manage_opened',
      'owner_dashboard_view','push_enabled','feedback_submitted'
    )
  ),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agendaleve_product_events_session_hash_check check (session_hash ~ '^[0-9a-f]{64}$')
);

alter table public.agendaleve_product_events enable row level security;
revoke all privileges on table public.agendaleve_product_events from public, anon, authenticated;

create index if not exists agendaleve_product_events_created_idx
  on public.agendaleve_product_events (created_at desc);
create index if not exists agendaleve_product_events_name_created_idx
  on public.agendaleve_product_events (event_name, created_at desc);

create table if not exists public.agendaleve_beta_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 0,
  primary key (ip_hash, window_start)
);

alter table public.agendaleve_beta_rate_limits enable row level security;
revoke all privileges on table public.agendaleve_beta_rate_limits from public, anon, authenticated;

create or replace function public.agendaleve_consume_beta_rate_limit(
  p_ip_hash text,
  p_window_start timestamptz,
  p_limit integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempts integer;
begin
  insert into public.agendaleve_beta_rate_limits (ip_hash, window_start, attempts)
  values (p_ip_hash, p_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set attempts = public.agendaleve_beta_rate_limits.attempts + 1
  returning attempts into v_attempts;

  return v_attempts <= greatest(1, least(p_limit, 120));
end;
$$;

revoke all on function public.agendaleve_consume_beta_rate_limit(text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.agendaleve_consume_beta_rate_limit(text, timestamptz, integer)
  to service_role;

create or replace function public.agendaleve_get_server_config()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'vapid_public_key', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_vapid_public_key' limit 1),
    'vapid_private_key', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_vapid_private_key' limit 1),
    'vapid_subject', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_vapid_subject' limit 1),
    'cron_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_cron_secret' limit 1),
    'turnstile_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_turnstile_secret' limit 1)
  );
$$;

revoke all on function public.agendaleve_get_server_config()
  from public, anon, authenticated;
grant execute on function public.agendaleve_get_server_config()
  to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'agendaleve-reminder-dispatch' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'agendaleve-reminder-dispatch',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_project_url' limit 1)
        || '/functions/v1/reminder-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_publishable_key' limit 1),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'agendaleve_cron_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $$
);
