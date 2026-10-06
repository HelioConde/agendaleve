import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const allowedOrigins = new Set([
  "https://helioconde.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function hashText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function getSecretKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (parsed && typeof parsed === "object" && typeof parsed.default === "string" && parsed.default) {
        return parsed.default;
      }
    } catch {
      // Fall back to the legacy service role key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function timeToMinutes(value: string) {
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total: number) {
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function zonedLocalToUtcIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const intended = Date.UTC(year, month - 1, day, hour, minute, 0);

  const getOffset = (epochMs: number) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(epochMs));
    const map = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    const representedAsUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second),
    );
    return representedAsUtc - epochMs;
  };

  let corrected = intended - getOffset(intended);
  corrected = intended - getOffset(corrected);
  return new Date(corrected).toISOString();
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(405, { error: "Método não permitido." }, origin);
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "Origem não permitida." }, origin);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json(400, { error: "Pedido inválido." }, origin);
  }

  const businessSlug = typeof input.businessSlug === "string" ? input.businessSlug.trim().toLowerCase() : "";
  const serviceId = typeof input.serviceId === "string" ? input.serviceId : "";
  const date = typeof input.date === "string" ? input.date : "";
  const manageBookingId = typeof input.bookingId === "string" ? input.bookingId.trim() : "";
  const manageToken = typeof input.cancelToken === "string" ? input.cancelToken.trim() : "";
  const manageMode = Boolean(manageBookingId || manageToken);

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(businessSlug) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    (manageMode && (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(manageBookingId) ||
      !/^[A-Za-z0-9_-]{32}$/.test(manageToken)
    ))
  ) {
    return json(400, { error: "Confira os dados." }, origin);
  }

  const requestedDate = new Date(date + "T00:00:00Z");
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const maxUtc = new Date(todayUtc);
  maxUtc.setUTCDate(maxUtc.getUTCDate() + 180);
  if (!Number.isFinite(requestedDate.getTime()) || requestedDate < todayUtc || requestedDate > maxUtc) {
    return json(400, { error: "Escolha uma data válida nos próximos 180 dias." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço temporariamente indisponível." }, origin);

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: business, error: businessError } = await client
    .from("agendaleve_businesses")
    .select("id, slug, name, timezone, slot_interval_minutes, is_public")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (businessError) return json(503, { error: "Não foi possível consultar a agenda." }, origin);
  if (!business) return json(404, { error: "Negócio indisponível." }, origin);

  let excludedBookingId = "";
  if (manageMode) {
    const { data: managed, error: managedError } = await client
      .from("agendaleve_bookings")
      .select("id,business_id,service_id")
      .eq("id", manageBookingId)
      .eq("cancel_token_hash", await hashText(manageToken))
      .eq("business_id", business.id)
      .eq("service_id", serviceId)
      .in("status", ["pending", "confirmed"])
      .gt("starts_at", new Date().toISOString())
      .maybeSingle();

    if (managedError) return json(503, { error: "Não foi possível validar a reserva." }, origin);
    if (!managed) return json(403, { error: "Link de gerenciamento inválido." }, origin);
    excludedBookingId = managed.id;
  } else if (!business.is_public) {
    return json(404, { error: "Negócio indisponível." }, origin);
  }

  const { data: service, error: serviceError } = await client
    .from("agendaleve_services")
    .select("id, business_id, name, duration_minutes, price_cents, is_active")
    .eq("id", serviceId)
    .eq("business_id", business.id)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError) return json(503, { error: "Não foi possível consultar o serviço." }, origin);
  if (!service) return json(404, { error: "Serviço indisponível." }, origin);

  const weekday = requestedDate.getUTCDay();
  const { data: hours, error: hoursError } = await client
    .from("agendaleve_business_hours")
    .select("opens_at, closes_at")
    .eq("business_id", business.id)
    .eq("weekday", weekday)
    .maybeSingle();

  if (hoursError) return json(503, { error: "Não foi possível consultar o expediente." }, origin);
  if (!hours) return json(200, { slots: [], business: business.name, service: service.name }, origin);

  const dayStart = zonedLocalToUtcIso(date, "00:00", business.timezone);
  const dayEnd = zonedLocalToUtcIso(addDays(date, 1), "00:00", business.timezone);

  let bookingQuery = client
    .from("agendaleve_bookings")
    .select("id, starts_at, ends_at")
    .eq("business_id", business.id)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", dayEnd)
    .gt("ends_at", dayStart);

  if (excludedBookingId) bookingQuery = bookingQuery.neq("id", excludedBookingId);
  const { data: bookings, error: bookingsError } = await bookingQuery;

  if (bookingsError) return json(503, { error: "Não foi possível consultar os horários ocupados." }, origin);

  const occupied = (bookings || []).map(item => ({
    start: Date.parse(item.starts_at),
    end: Date.parse(item.ends_at),
  }));

  const open = timeToMinutes(hours.opens_at);
  const close = timeToMinutes(hours.closes_at);
  const duration = Number(service.duration_minutes);
  const step = Number(business.slot_interval_minutes);
  const now = Date.now();
  const slots: Array<{ time: string; startsAt: string }> = [];

  for (let start = open; start + duration <= close; start += step) {
    const time = minutesToTime(start);
    const endTime = minutesToTime(start + duration);
    const startsAt = zonedLocalToUtcIso(date, time, business.timezone);
    const endsAt = zonedLocalToUtcIso(date, endTime, business.timezone);
    const startMs = Date.parse(startsAt);
    const endMs = Date.parse(endsAt);
    if (startMs <= now) continue;
    const overlaps = occupied.some(item => startMs < item.end && item.start < endMs);
    if (!overlaps) slots.push({ time, startsAt });
  }

  return json(200, {
    business: business.name,
    service: service.name,
    date,
    slots,
  }, origin);
});
