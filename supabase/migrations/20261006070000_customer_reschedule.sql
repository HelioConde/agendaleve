drop function if exists public.agendaleve_reschedule_public_booking(uuid, text, timestamptz);

create or replace function public.agendaleve_reschedule_public_booking(
  p_booking_id uuid,
  p_cancel_token_hash text,
  p_starts_at timestamptz
)
returns table (
  booking_id uuid,
  business_slug text,
  business_name text,
  service_name text,
  booked_starts_at timestamptz,
  booked_ends_at timestamptz,
  booking_status text
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_booking public.agendaleve_bookings%rowtype;
  v_business public.agendaleve_businesses%rowtype;
  v_service public.agendaleve_services%rowtype;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday smallint;
begin
  if p_booking_id is null
     or p_cancel_token_hash is null
     or p_cancel_token_hash !~ '^[0-9a-f]{64}$'
     or p_starts_at is null
     or p_starts_at <= now() then
    raise exception 'Invalid booking details' using errcode = '22023';
  end if;

  select * into v_booking
  from public.agendaleve_bookings b
  where b.id = p_booking_id
    and b.cancel_token_hash = p_cancel_token_hash
    and b.status in ('pending', 'confirmed')
    and b.starts_at > now()
  for update;

  if not found then
    raise exception 'Booking unavailable' using errcode = 'P0002';
  end if;

  select * into v_business
  from public.agendaleve_businesses b
  where b.id = v_booking.business_id;

  if not found then
    raise exception 'Business unavailable' using errcode = 'P0002';
  end if;

  select * into v_service
  from public.agendaleve_services s
  where s.id = v_booking.service_id
    and s.business_id = v_booking.business_id
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
         and mod(
           (extract(epoch from (v_local_start::time - h.opens_at)) / 60)::integer,
           v_business.slot_interval_minutes
         ) = 0
     ) then
    raise exception 'Time unavailable' using errcode = '22023';
  end if;

  update public.agendaleve_bookings
  set starts_at = p_starts_at,
      ends_at = p_starts_at + make_interval(mins => v_service.duration_minutes)
  where id = v_booking.id;

  return query
  select
    v_booking.id,
    v_business.slug,
    v_business.name,
    v_service.name,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    v_booking.status;
exception
  when exclusion_violation then
    raise exception 'Time unavailable' using errcode = '23P01';
end;
$$;

revoke all on function public.agendaleve_reschedule_public_booking(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.agendaleve_reschedule_public_booking(uuid, text, timestamptz)
  to service_role;
