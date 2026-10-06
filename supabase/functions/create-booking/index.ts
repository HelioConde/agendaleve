import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://helioconde.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const maxBodyBytes = 4096;

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

async function hashIp(ip: string) {
  const bytes = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return null;
    if (Number(contentLength) > maxBodyBytes) throw new RangeError("body_too_large");
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        await reader.cancel();
        throw new RangeError("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
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
      // Fall back to the legacy key while projects migrate to the new key format.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(405, { error: "Método não permitido." }, origin);
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "Origem não permitida." }, origin);

  const contentType = request.headers.get("content-type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return json(415, { error: "Envie os dados em formato JSON." }, origin);
  }

  let input: Record<string, unknown>;
  try {
    const parsed = await readJsonBody(request);
    if (!parsed) return json(400, { error: "Pedido inválido." }, origin);
    input = parsed;
  } catch (error) {
    if (error instanceof RangeError && error.message === "body_too_large") {
      return json(413, { error: "Pedido muito grande." }, origin);
    }
    return json(400, { error: "Pedido inválido." }, origin);
  }

  const businessSlug = typeof input.businessSlug === "string" ? input.businessSlug.trim().toLowerCase() : "";
  const serviceId = typeof input.serviceId === "string" ? input.serviceId : "";
  const startsAt = typeof input.startsAt === "string" ? input.startsAt : "";
  const clientName = typeof input.clientName === "string" ? input.clientName.trim() : "";

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(businessSlug)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)
      || !Number.isFinite(Date.parse(startsAt))
      || clientName.length < 1 || clientName.length > 80) {
    return json(400, { error: "Confira os dados da reserva." }, origin);
  }

  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!forwarded) return json(503, { error: "Não foi possível processar a reserva agora." }, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço temporariamente indisponível." }, origin);

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const windowEpoch = Math.floor(Date.now() / 600_000) * 600;
  const windowStart = new Date(windowEpoch * 1000).toISOString();
  const { data: allowed, error: limitError } = await client.rpc("consume_booking_rate_limit", {
    p_ip_hash: await hashIp(forwarded),
    p_window_start: windowStart,
  });
  if (limitError || allowed !== true) {
    const status = limitError ? 503 : 429;
    return json(status, { error: status === 429 ? "Muitas tentativas. Tente novamente em alguns minutos." : "Serviço temporariamente indisponível." }, origin);
  }

  const { data, error } = await client.rpc("create_public_booking", {
    p_business_slug: businessSlug,
    p_service_id: serviceId,
    p_starts_at: new Date(startsAt).toISOString(),
    p_client_name: clientName,
  });
  if (error) {
    const status = error.code === "23P01" ? 409
      : error.code === "P0002" ? 404
      : error.code === "22023" ? 400
      : 503;
    return json(status, {
      error: status === 409 ? "Esse horário acabou de ser reservado. Escolha outro."
        : status === 404 ? "Negócio ou serviço indisponível."
        : status === 400 ? "Horário ou dados inválidos."
        : "Não foi possível concluir a reserva agora.",
    }, origin);
  }

  const booking = Array.isArray(data) ? data[0] : data;
  return json(201, {
    bookingId: booking?.booking_id,
    service: booking?.booked_service,
    startsAt: booking?.booked_starts_at,
  }, origin);
});
