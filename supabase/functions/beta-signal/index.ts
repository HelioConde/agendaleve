import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const allowedOrigins = new Set([
  "https://helioconde.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:4173",
]);
const eventNames = new Set([
  "page_view","booking_started","booking_created","booking_manage_opened",
  "owner_dashboard_view","push_enabled","feedback_submitted",
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

  const kind = input.kind === "feedback" ? "feedback" : input.kind === "event" ? "event" : "";
  const role = input.role === "owner" ? "owner" : input.role === "client" ? "client" : "";
  const sessionId = typeof input.sessionId === "string" ? input.sessionId.trim() : "";
  const businessSlug = typeof input.businessSlug === "string" ? input.businessSlug.trim().toLowerCase() : "";
  if (!kind || !role || sessionId.length < 16 || sessionId.length > 128) {
    return json(400, { error: "Dados inválidos." }, origin);
  }

  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço indisponível." }, origin);
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const windowEpoch = Math.floor(Date.now() / 600_000) * 600;
  const { data: allowed, error: limitError } = await client.rpc("agendaleve_consume_beta_rate_limit", {
    p_ip_hash: await hashText(forwarded),
    p_window_start: new Date(windowEpoch * 1000).toISOString(),
    p_limit: kind === "feedback" ? 10 : 60,
  });
  if (limitError || allowed !== true) {
    return json(limitError ? 503 : 429, { error: "Muitas tentativas." }, origin);
  }

  let businessId: string | null = null;
  if (businessSlug) {
    const { data: business } = await client
      .from("agendaleve_businesses")
      .select("id")
      .eq("slug", businessSlug)
      .maybeSingle();
    businessId = business?.id || null;
  }

  if (kind === "event") {
    const eventName = typeof input.eventName === "string" ? input.eventName : "";
    if (!eventNames.has(eventName)) return json(400, { error: "Evento inválido." }, origin);
    const context = input.context && typeof input.context === "object" && !Array.isArray(input.context)
      ? input.context
      : {};
    const { error } = await client.from("agendaleve_product_events").insert({
      business_id: businessId,
      session_hash: await hashText(sessionId),
      role,
      event_name: eventName,
      context,
    });
    if (error) return json(503, { error: "Não foi possível registrar." }, origin);
    return json(201, { recorded: true }, origin);
  }

  const rating = Number(input.rating);
  const comment = typeof input.comment === "string" ? input.comment.trim().slice(0, 1000) : "";
  const context = typeof input.context === "string" ? input.context.slice(0, 80) : "general";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json(400, { error: "Avaliação inválida." }, origin);
  }

  const { error } = await client.from("agendaleve_feedback").insert({
    business_id: businessId,
    role,
    rating,
    comment: comment || null,
    context,
  });
  if (error) return json(503, { error: "Não foi possível enviar o feedback." }, origin);

  await client.from("agendaleve_product_events").insert({
    business_id: businessId,
    session_hash: await hashText(sessionId),
    role,
    event_name: "feedback_submitted",
    context: { rating, context },
  });

  return json(201, { recorded: true }, origin);
});
