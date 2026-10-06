# Fullstack architecture

## Backend
Uses the shared Supabase project `pizzaria-db`.

Existing tables:
- `agendaleve_businesses`
- `agendaleve_business_hours`
- `agendaleve_services`
- `agendaleve_bookings`
- `agendaleve_booking_rate_limits`
- `product_subscriptions`

The module already uses RLS and booking-specific database constraints.

## Production path
The current UI is connected to Supabase Auth and the existing schema. Public booking creation remains server-validated, owner data is isolated by RLS, each reservation can store a private WhatsApp/phone contact, the owner dashboard supports period/status filters plus confirm/complete/cancel actions, and public bookings receive a cryptographically random management token whose hash is stored server-side. Customers can use that private link to inspect a sanitized reservation, query availability excluding their current booking, reschedule transactionally or cancel without creating an account. Next production steps are reminder jobs, external abuse protection (CAPTCHA/Turnstile) and broader real-world QA.

## Internacionalização

O produto usa uma camada de i18n no frontend com:

- PT-BR como locale padrão e fallback;
- inglês como segundo idioma obrigatório;
- seletor PT/EN acessível;
- preferência persistida em `localStorage`;
- tradução também de conteúdo dinâmico gerado pelo JavaScript;
- formatação localizada de datas, números e moeda;
- atualização de `lang`, title, description e Open Graph conforme o idioma ativo;
- preservação do texto original em PT-BR ao alternar entre os idiomas.

## QA gates
Double-booking, timezone handling, overlapping services, cancellation rules, rate limiting, mobile booking flow and cross-account isolation are release blockers.


## Branding público

`agendaleve_businesses.brand_color` armazena a cor principal do negócio com validação hexadecimal. O frontend mantém fallback seguro, calcula automaticamente uma cor de texto legível e aplica a personalização somente na experiência de reserva/preview do cliente.


## Bloqueios e folgas

`agendaleve_time_off` armazena períodos fechados por negócio com RLS por proprietário. O frontend respeita os bloqueios em modo local/nuvem e as Edge Functions de disponibilidade, criação e reagendamento verificam novamente a data no servidor antes de permitir uma reserva pública.
