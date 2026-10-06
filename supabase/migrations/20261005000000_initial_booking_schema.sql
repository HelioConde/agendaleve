-- AgendaLeve initial multi-business booking schema.
-- Initial schema for private owner data and server-side public booking. API table grants remain
-- revoked until the public discovery and authenticated owner flows are ready to be enabled.
create extension if not exists btree_gist with schema extensions;

create table public.businesses (
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

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  check (opens_at < closes_at),
  unique (business_id, weekday)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 70),
  duration_minutes smallint not null check (duration_minutes between 5 and 480),
  price_cents integer not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
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
    references public.services(id, business_id) on delete restrict,
  constraint bookings_no_active_overlap
    exclude using gist (
      business_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'confirmed'))
);

create index bookings_business_starts_at_idx
  on public.bookings (business_id, starts_at)
  where status in ('pending', 'confirmed');

create table public.booking_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (ip_hash, window_start)
);

alter table public.businesses enable row level security;
alter table public.business_hours enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_rate_limits enable row level security;

-- Only the columns required for the public booking page are readable without login.
grant select (id, slug, name, timezone, slot_interval_minutes, is_public) on public.businesses to anon;
grant select (business_id, weekday, opens_at, closes_at) on public.business_hours to anon;
grant select (id, business_id, name, duration_minutes, price_cents) on public.services to anon;
grant select, insert, update, delete on public.businesses, public.business_hours, public.services, public.bookings to authenticated;
grant usage on schema public to anon, authenticated;

create policy "Public can view active businesses"
  on public.businesses for select to anon
  using (is_public);

create policy "Owners manage their businesses"
  on public.businesses for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Public can view hours for active businesses"
  on public.business_hours for select to anon
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_public
    )
  );

create policy "Owners manage their business hours"
  on public.business_hours for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  );

create policy "Public can view active services for active businesses"
  on public.services for select to anon
  using (
    is_active and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_public
    )
  );

create policy "Owners manage their services"
  on public.services for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  );

create policy "Owners manage their bookings"
  on public.bookings for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
  );

-- This table and both RPCs are server-only. Never call them with a browser key.
revoke all on public.booking_rate_limits from anon, authenticated;
revoke all on public.businesses, public.business_hours, public.services, public.bookings from anon, authenticated;

create or replace function public.consume_booking_rate_limit(
  p_ip_hash text,
  p_window_start timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  insert into public.booking_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, p_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.booking_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= 5;
end;
$$;

create or replace function public.create_public_booking(
  p_business_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text
)
returns table (booking_id uuid, booked_service text, booked_starts_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_business public.businesses%rowtype;
  v_service public.services%rowtype;
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
  from public.businesses b
  where b.slug = lower(trim(p_business_slug)) and b.is_public;

  if not found then
    raise exception 'Business unavailable' using errcode = 'P0002';
  end if;

  select * into v_service
  from public.services s
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
       from public.business_hours h
       where h.business_id = v_business.id
         and h.weekday = v_weekday
         and v_local_start::time >= h.opens_at
         and v_local_end::time <= h.closes_at
         and mod((extract(epoch from (v_local_start::time - h.opens_at)) / 60)::integer, v_business.slot_interval_minutes) = 0
     ) then
    raise exception 'Time unavailable' using errcode = '22023';
  end if;

  insert into public.bookings (
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

revoke all on function public.consume_booking_rate_limit(text, timestamptz) from public, anon, authenticated;
revoke all on function public.create_public_booking(text, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.consume_booking_rate_limit(text, timestamptz) to service_role;
grant execute on function public.create_public_booking(text, uuid, timestamptz, text) to service_role;
