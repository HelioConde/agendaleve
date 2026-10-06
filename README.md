# AgendaLeve

Agenda online para pequenos negócios, com painel do proprietário e página pública de reservas.

## Estado atual

- modo local sem conta;
- Supabase Auth;
- negócio, expediente, serviços e reservas persistidos no `pizzaria-db`;
- link público por `?negocio=slug`;
- disponibilidade em tempo real;
- telefone/WhatsApp privado por reserva para retorno do estabelecimento;
- filtros da agenda por período e status;
- ações rápidas para confirmar, concluir e cancelar atendimentos;
- cancelamento seguro pelo cliente através de link privado com token;
- Edge Function `booking-availability` sem exposição de dados privados;
- Edge Function `create-booking` com validação, rate limit, token de cancelamento e prevenção de conflitos;
- Edge Function `cancel-booking` para cancelamento sem login, validado por token;
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
