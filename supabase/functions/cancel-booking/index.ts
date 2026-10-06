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
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function getSecretKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed: unknown = JSON.parse(secretKeys);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const defaultKey = (parsed as Record<string, unknown>).default;
        if (typeof defaultKey === "string" && defaultKey.length > 0) return defaultKey;
      }
    } catch {
      // Fall back while the project migrates all server keys.
    }
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
    return json(400, { error: "Link de cancelamento inválido." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço temporariamente indisponível." }, origin);

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client
    .from("agendaleve_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("cancel_token_hash", await hashText(cancelToken))
    .in("status", ["pending", "confirmed"])
    .gt("starts_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (error) return json(503, { error: "Não foi possível cancelar a reserva agora." }, origin);
  if (!data) return json(404, { error: "Reserva indisponível para cancelamento." }, origin);

  return json(200, { cancelled: true }, origin);
});
