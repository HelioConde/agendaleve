# AgendaLeve

Agenda online para pequenos negócios, com painel do proprietário e página pública de reservas.

## Estado atual

- modo local sem conta;
- Supabase Auth;
- negócio, expediente, serviços e reservas persistidos no `pizzaria-db`;
- link público por `?negocio=slug`;
- disponibilidade em tempo real;
- Edge Function `booking-availability` sem exposição de dados privados;
- Edge Function `create-booking` com validação, rate limit e prevenção de conflitos;
- RLS separando proprietário, visitante público e reservas privadas;
- GitHub Pages + CI;
- SEO básico.

## Backend

Tabelas:
- `agendaleve_businesses`
- `agendaleve_business_hours`
- `agendaleve_services`
- `agendaleve_bookings`
- `agendaleve_booking_rate_limits`
- `product_subscriptions`

As migrations e Edge Functions ficam em `supabase/`. Consulte também `SUPABASE_SETUP.md` e `FULLSTACK.md`.
