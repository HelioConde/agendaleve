-- AgendaLeve initial multi-business booking schema.
-- Initial schema for private owner data and server-side public booking. API table grants remain
-- revoked until the public discovery and authenticated owner flows are ready to be enabled.
create extension if not exists btree_gist with schema extensions;

create table public.agendaleve_businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  timezone text not null default 'America/Sao_Paulo',
  slot_interval_minutes smallint not null default 30 check (slot_interval_minutes between 5 and 240),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agendaleve_business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.agendaleve_businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  check (opens_at < closes_at),
  unique (business_id, weekday)
);

create table public.agendaleve_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.agendaleve_businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 70),
  duration_minutes smallint not null check (duration_minutes between 5 and 480),
  price_cents integer not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.agendaleve_bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.agendaleve_businesses(id) on delete cascade,
  service_id uuid not null,
  client_name text not null check (char_length(trim(client_name)) between 1 and 80),
  service_name text not null,
  price_cents integer not null check (price_cents >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (service_id, business_id)
    references public.agendaleve_services(id, business_id) on delete restrict,
  constraint agendaleve_bookings_no_active_overlap
    exclude using gist (
      business_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'confirmed'))
);

create index agendaleve_bookings_business_starts_at_idx
  on public.agendaleve_bookings (business_id, starts_at)
  where status in ('pending', 'confirmed');

create table public.agendaleve_booking_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (ip_hash, window_start)
);

alter table public.agendaleve_businesses enable row level security;
alter table public.agendaleve_business_hours enable row level security;
alter table public.agendaleve_services enable row level security;
alter table public.agendaleve_bookings enable row level security;
alter table public.agendaleve_booking_rate_limits enable row level security;

-- Keep the schema reachable but grant no table access yet. Add narrow grants only during reviewed app integration.
grant usage on schema public to anon, authenticated;

create policy "Public can view active agendaleve_businesses"
  on public.agendaleve_businesses for select to anon
  using (is_public);

create policy "Owners manage their agendaleve_businesses"
  on public.agendaleve_businesses for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Public can view hours for active agendaleve_businesses"
  on public.agendaleve_business_hours for select to anon
  using (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.is_public
    )
  );

create policy "Owners manage their business hours"
  on public.agendaleve_business_hours for all to authenticated
  using (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  );

create policy "Public can view active agendaleve_services for active agendaleve_businesses"
  on public.agendaleve_services for select to anon
  using (
    is_active and exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.is_public
    )
  );

create policy "Owners manage their agendaleve_services"
  on public.agendaleve_services for all to authenticated
  using (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  );

create policy "Owners manage their agendaleve_bookings"
  on public.agendaleve_bookings for all to authenticated
  using (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.agendaleve_businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  );

-- This table and both RPCs are server-only. Never call them with a browser key.
revoke all on public.agendaleve_booking_rate_limits from public, anon, authenticated;
revoke all on public.agendaleve_businesses, public.agendaleve_business_hours, public.agendaleve_services, public.agendaleve_bookings from public, anon, authenticated;

create or replace function public.agendaleve_consume_booking_rate_limit(
  p_ip_hash text,
  p_window_start timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  insert into public.agendaleve_booking_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, p_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.agendaleve_booking_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= 5;
end;
$$;

create or replace function public.agendaleve_create_public_booking(
  p_business_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text
)
returns table (booking_id uuid, booked_service text, booked_starts_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_business public.agendaleve_businesses%rowtype;
  v_service public.agendaleve_services%rowtype;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday smallint;
  v_booking_id uuid;
begin
  if p_client_name is null or char_length(trim(p_client_name)) not between 1 and 80 then
    raise exception 'Invalid booking details' using errcode = '22023';
  end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Invalid booking details' using errcode = '22023';
  end if;

  select * into v_business
  from public.agendaleve_businesses b
  where b.slug = lower(trim(p_business_slug)) and b.is_public;

  if not found then
    raise exception 'Business unavailable' using errcode = 'P0002';
  end if;

  select * into v_service
  from public.agendaleve_services s
  where s.id = p_service_id
    and s.business_id = v_business.id
    and s.is_active;

  if not found then
    raise exception 'Service unavailable' using errcode = 'P0002';
  end if;

  v_local_start := p_starts_at at time zone v_business.timezone;
  v_local_end := v_local_start + make_interval(mins => v_service.duration_minutes);
  v_weekday := extract(dow from v_local_start)::smallint;

  if v_local_start::date < (now() at time zone v_business.timezone)::date
     or v_local_start::date <> v_local_end::date
     or date_trunc('minute', v_local_start) <> v_local_start
     or not exists (
       select 1
       from public.agendaleve_business_hours h
       where h.business_id = v_business.id
         and h.weekday = v_weekday
         and v_local_start::time >= h.opens_at
         and v_local_end::time <= h.closes_at
         and mod((extract(epoch from (v_local_start::time - h.opens_at)) / 60)::integer, v_business.slot_interval_minutes) = 0
     ) then
    raise exception 'Time unavailable' using errcode = '22023';
  end if;

  insert into public.agendaleve_bookings (
    business_id, service_id, client_name, service_name, price_cents,
    starts_at, ends_at, status
  )
  values (
    v_business.id, v_service.id, trim(p_client_name), v_service.name, v_service.price_cents,
    p_starts_at, p_starts_at + make_interval(mins => v_service.duration_minutes), 'pending'
  )
  returning id into v_booking_id;

  return query select v_booking_id, v_service.name, p_starts_at;
exception
  when exclusion_violation then
    raise exception 'Time unavailable' using errcode = '23P01';
end;
$$;

grant select, insert, update, delete on public.agendaleve_businesses, public.agendaleve_business_hours, public.agendaleve_services, public.agendaleve_bookings to service_role;
grant select, insert, update, delete on public.agendaleve_booking_rate_limits to service_role;

revoke all on function public.agendaleve_consume_booking_rate_limit(text, timestamptz) from public, anon, authenticated;
revoke all on function public.agendaleve_create_public_booking(text, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.agendaleve_consume_booking_rate_limit(text, timestamptz) to service_role;
grant execute on function public.agendaleve_create_public_booking(text, uuid, timestamptz, text) to service_role;
