alter table public.agendaleve_bookings
  drop constraint if exists agendaleve_bookings_status_check;

alter table public.agendaleve_bookings
  add constraint agendaleve_bookings_status_check
  check (status in ('pending','confirmed','cancelled','completed','no_show'));
