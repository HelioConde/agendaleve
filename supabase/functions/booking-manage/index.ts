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
      const parsed: unknown = JSON.parse(secretKeys);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const key = (parsed as Record<string, unknown>).default;
        if (typeof key === "string" && key) return key;
      }
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(405, { error: "Método não permitido." }, origin);
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "Origem não permitida." }, origin);

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(400, { error: "Pedido inválido." }, origin);
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Pedido inválido." }, origin);
  }

  const bookingId = typeof input.bookingId === "string" ? input.bookingId.trim() : "";
  const cancelToken = typeof input.cancelToken === "string" ? input.cancelToken.trim() : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId) ||
    !/^[A-Za-z0-9_-]{32}$/.test(cancelToken)
  ) {
    return json(400, { error: "Link de gerenciamento inválido." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço temporariamente indisponível." }, origin);

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await hashText(cancelToken);

  const { data: booking, error: bookingError } = await client
    .from("agendaleve_bookings")
    .select("id,business_id,service_id,service_name,starts_at,ends_at,status")
    .eq("id", bookingId)
    .eq("cancel_token_hash", tokenHash)
    .in("status", ["pending", "confirmed"])
    .gt("starts_at", new Date().toISOString())
    .maybeSingle();

  if (bookingError) return json(503, { error: "Não foi possível consultar a reserva." }, origin);
  if (!booking) return json(404, { error: "Reserva indisponível." }, origin);

  const [{ data: business, error: businessError }, { data: service, error: serviceError }, { data: hours, error: hoursError }] = await Promise.all([
    client
      .from("agendaleve_businesses")
      .select("id,slug,name,timezone,slot_interval_minutes")
      .eq("id", booking.business_id)
      .maybeSingle(),
    client
      .from("agendaleve_services")
      .select("id,name,duration_minutes,price_cents,is_active")
      .eq("id", booking.service_id)
      .eq("business_id", booking.business_id)
      .maybeSingle(),
    client
      .from("agendaleve_business_hours")
      .select("weekday,opens_at,closes_at")
      .eq("business_id", booking.business_id)
      .order("weekday"),
  ]);

  if (businessError || serviceError || hoursError) {
    return json(503, { error: "Não foi possível carregar os dados da reserva." }, origin);
  }
  if (!business || !service) return json(404, { error: "Reserva indisponível." }, origin);

  return json(200, {
    booking: {
      id: booking.id,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      status: booking.status,
    },
    business: {
      slug: business.slug,
      name: business.name,
      timezone: business.timezone,
      slotIntervalMinutes: Number(business.slot_interval_minutes),
    },
    service: {
      id: service.id,
      name: service.name,
      duration: Number(service.duration_minutes),
      price: Number(service.price_cents) / 100,
      active: Boolean(service.is_active),
    },
    hours: hours || [],
  }, origin);
});
