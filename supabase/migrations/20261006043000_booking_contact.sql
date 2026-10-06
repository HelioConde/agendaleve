alter table public.agendaleve_bookings
  add column if not exists client_phone text;

alter table public.agendaleve_bookings
  drop constraint if exists agendaleve_bookings_client_phone_check;

alter table public.agendaleve_bookings
  add constraint agendaleve_bookings_client_phone_check
  check (client_phone is null or client_phone ~ '^\\+?[0-9]{10,15}$');

drop function if exists public.agendaleve_create_public_booking(text, uuid, timestamptz, text);

create or replace function public.agendaleve_create_public_booking(
  p_business_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text
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
  if p_client_phone is null or trim(p_client_phone) !~ '^\\+?[0-9]{10,15}$' then
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
    business_id, service_id, client_name, client_phone, service_name, price_cents,
    starts_at, ends_at, status
  )
  values (
    v_business.id, v_service.id, trim(p_client_name), trim(p_client_phone), v_service.name, v_service.price_cents,
    p_starts_at, p_starts_at + make_interval(mins => v_service.duration_minutes), 'pending'
  )
  returning id into v_booking_id;

  return query select v_booking_id, v_service.name, p_starts_at;
exception
  when exclusion_violation then
    raise exception 'Time unavailable' using errcode = '23P01';
end;
$$;

revoke all on function public.agendaleve_create_public_booking(text, uuid, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.agendaleve_create_public_booking(text, uuid, timestamptz, text, text)
  to service_role;
