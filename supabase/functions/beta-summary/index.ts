import { createClient } from "npm:@supabase/supabase-js@2.117.2";

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

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Método não permitido." });

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Sessão obrigatória." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Serviço indisponível." });

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(401, { error: "Sessão inválida." });

  const { data: business, error: businessError } = await client
    .from("agendaleve_businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) return json(503, { error: "Não foi possível carregar o negócio." });
  if (!business) {
    return json(200, {
      started: 0,
      completed: 0,
      conversion: 0,
      feedbackCount: 0,
      averageRating: null,
    });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: events, error: eventsError }, { data: feedback, error: feedbackError }] = await Promise.all([
    client.from("agendaleve_product_events")
      .select("session_hash,event_name")
      .eq("business_id", business.id)
      .gte("created_at", since)
      .in("event_name", ["booking_started", "booking_created"]),
    client.from("agendaleve_feedback")
      .select("rating,role")
      .eq("business_id", business.id)
      .gte("created_at", since),
  ]);

  if (eventsError || feedbackError) return json(503, { error: "Não foi possível calcular as métricas." });

  const started = new Set((events || []).filter(item => item.event_name === "booking_started").map(item => item.session_hash)).size;
  const completed = new Set((events || []).filter(item => item.event_name === "booking_created").map(item => item.session_hash)).size;
  const clientFeedback = (feedback || []).filter(item => item.role === "client");
  const feedbackCount = clientFeedback.length;
  const averageRating = feedbackCount
    ? Number((clientFeedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) / feedbackCount).toFixed(1))
    : null;
  const conversion = started ? Number(((completed / started) * 100).toFixed(1)) : 0;

  return json(200, {
    started,
    completed,
    conversion,
    feedbackCount,
    averageRating,
    windowDays: 30,
  });
});
