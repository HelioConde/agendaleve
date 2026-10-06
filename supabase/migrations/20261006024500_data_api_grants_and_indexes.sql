-- Mantém o schema versionado de acordo com o projeto remoto pizzaria-db.
-- A API do Supabase exige GRANT + RLS: as policies definem quais linhas;
-- estes grants definem quais operações os papéis podem tentar executar.

create index if not exists agendaleve_businesses_owner_idx
  on public.agendaleve_businesses(owner_id);

create index if not exists agendaleve_services_business_idx
  on public.agendaleve_services(business_id);

create index if not exists agendaleve_bookings_service_business_idx
  on public.agendaleve_bookings(service_id, business_id);

grant select on public.agendaleve_businesses to anon;
grant select on public.agendaleve_business_hours to anon;
grant select on public.agendaleve_services to anon;

grant select, insert, update, delete on public.agendaleve_businesses to authenticated;
grant select, insert, update, delete on public.agendaleve_business_hours to authenticated;
grant select, insert, update, delete on public.agendaleve_services to authenticated;
grant select, insert, update, delete on public.agendaleve_bookings to authenticated;
