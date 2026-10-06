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
The current UI is connected to Supabase Auth and the existing schema. Public booking creation remains server-validated, owner data is isolated by RLS, each reservation can store a private WhatsApp/phone contact, and the owner dashboard supports period/status filters plus confirm/complete/cancel actions. Next production steps are customer self-service cancellation/rebooking, reminder jobs and abuse protection (CAPTCHA/Turnstile).

## QA gates
Double-booking, timezone handling, overlapping services, cancellation rules, rate limiting, mobile booking flow and cross-account isolation are release blockers.
