alter table public.agendaleve_businesses
  add column if not exists brand_color text not null default '#1f6a4a';

alter table public.agendaleve_businesses
  drop constraint if exists agendaleve_businesses_brand_color_check;

alter table public.agendaleve_businesses
  add constraint agendaleve_businesses_brand_color_check
  check (brand_color ~ '^#[0-9A-Fa-f]{6}$');
