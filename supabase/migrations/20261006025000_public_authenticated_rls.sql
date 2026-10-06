-- Permite que links públicos do AgendaLeve funcionem tanto para visitantes
-- anônimos quanto para usuários que já possuem uma sessão Supabase.
-- Escritas continuam restritas ao proprietário.

drop policy if exists "Owners manage their agendaleve_businesses" on public.agendaleve_businesses;
drop policy if exists "Public can view active agendaleve_businesses" on public.agendaleve_businesses;

create policy "AgendaLeve businesses readable when public or owned"
on public.agendaleve_businesses
for select to anon, authenticated
using (is_public or owner_id = (select auth.uid()));

create policy "AgendaLeve owners insert businesses"
on public.agendaleve_businesses
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "AgendaLeve owners update businesses"
on public.agendaleve_businesses
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "AgendaLeve owners delete businesses"
on public.agendaleve_businesses
for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Owners manage their business hours" on public.agendaleve_business_hours;
drop policy if exists "Public can view hours for active agendaleve_businesses" on public.agendaleve_business_hours;

create policy "AgendaLeve hours readable when public or owned"
on public.agendaleve_business_hours
for select to anon, authenticated
using (
  exists (
    select 1 from public.agendaleve_businesses b
    where b.id = business_id
      and (b.is_public or b.owner_id = (select auth.uid()))
  )
);

create policy "AgendaLeve owners insert hours"
on public.agendaleve_business_hours
for insert to authenticated
with check (
  exists (
    select 1 from public.agendaleve_businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  )
);

create policy "AgendaLeve owners update hours"
on public.agendaleve_business_hours
for update to authenticated
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

create policy "AgendaLeve owners delete hours"
on public.agendaleve_business_hours
for delete to authenticated
using (
  exists (
    select 1 from public.agendaleve_businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners manage their agendaleve_services" on public.agendaleve_services;
drop policy if exists "Public can view active agendaleve_services for active agendalev" on public.agendaleve_services;

create policy "AgendaLeve services readable when public active or owned"
on public.agendaleve_services
for select to anon, authenticated
using (
  exists (
    select 1 from public.agendaleve_businesses b
    where b.id = business_id
      and (
        b.owner_id = (select auth.uid())
        or (b.is_public and is_active)
      )
  )
);

create policy "AgendaLeve owners insert services"
on public.agendaleve_services
for insert to authenticated
with check (
  exists (
    select 1 from public.agendaleve_businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  )
);

create policy "AgendaLeve owners update services"
on public.agendaleve_services
for update to authenticated
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

create policy "AgendaLeve owners delete services"
on public.agendaleve_services
for delete to authenticated
using (
  exists (
    select 1 from public.agendaleve_businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  )
);
