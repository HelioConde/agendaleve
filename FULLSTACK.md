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
Connect the current UI to Supabase Auth and the existing schema, keep booking creation server-validated, add reminder jobs and isolate business ownership by authenticated user.

## QA gates
Double-booking, timezone handling, overlapping services, cancellation rules, rate limiting, mobile booking flow and cross-account isolation are release blockers.
