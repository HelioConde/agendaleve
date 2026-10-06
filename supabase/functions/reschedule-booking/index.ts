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
  const startsAt = typeof input.startsAt === "string" ? input.startsAt.trim() : "";

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId) ||
    !/^[A-Za-z0-9_-]{32}$/.test(cancelToken) ||
    !Number.isFinite(Date.parse(startsAt))
  ) {
    return json(400, { error: "Dados de reagendamento inválidos." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço temporariamente indisponível." }, origin);

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.rpc("agendaleve_reschedule_public_booking", {
    p_booking_id: bookingId,
    p_cancel_token_hash: await hashText(cancelToken),
    p_starts_at: new Date(startsAt).toISOString(),
  });

  if (error) {
    const status = error.code === "23P01" ? 409
      : error.code === "P0002" ? 404
      : error.code === "22023" ? 400
      : 503;
    return json(status, {
      error: status === 409 ? "Esse horário acabou de ser reservado. Escolha outro."
        : status === 404 ? "Reserva indisponível para reagendamento."
        : status === 400 ? "Esse horário não pode ser usado."
        : "Não foi possível reagendar agora.",
    }, origin);
  }

  const booking = Array.isArray(data) ? data[0] : data;
  return json(200, {
    bookingId: booking?.booking_id,
    businessSlug: booking?.business_slug,
    business: booking?.business_name,
    service: booking?.service_name,
    startsAt: booking?.booked_starts_at,
    endsAt: booking?.booked_ends_at,
    status: booking?.booking_status,
  }, origin);
});
