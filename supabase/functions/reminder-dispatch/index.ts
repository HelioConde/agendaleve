import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import webpush from "npm:web-push@3.6.7";

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

function localTimeLabel(iso: string, timeZone: string, locale: "pt-BR" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Método não permitido." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Configuração indisponível." });

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: serverConfig, error: configError } = await client.rpc("agendaleve_get_server_config");
  if (configError || !serverConfig) return json(503, { error: "Configuração segura indisponível." });

  const cronSecret = String(serverConfig.cron_secret || "");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return json(403, { error: "Acesso negado." });
  }

  const vapidPublic = String(serverConfig.vapid_public_key || "");
  const vapidPrivate = String(serverConfig.vapid_private_key || "");
  const vapidSubject = String(serverConfig.vapid_subject || "https://helioconde.github.io/agendaleve/");
  if (!vapidPublic || !vapidPrivate) return json(503, { error: "Push não configurado." });

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const now = Date.now();
  const windowStart = new Date(now).toISOString();
  const windowEnd = new Date(now + 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString();

  const { data: bookings, error: bookingsError } = await client
    .from("agendaleve_bookings")
    .select("id,business_id,client_name,service_name,starts_at,status")
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd)
    .order("starts_at");

  if (bookingsError) return json(503, { error: "Não foi possível consultar reservas." });
  if (!bookings?.length) return json(200, { checked: 0, sent: 0 });

  const businessIds = [...new Set(bookings.map(item => item.business_id))];
  const { data: businesses, error: businessesError } = await client
    .from("agendaleve_businesses")
    .select("id,owner_id,name,timezone")
    .in("id", businessIds);

  if (businessesError) return json(503, { error: "Não foi possível consultar negócios." });
  const businessMap = new Map((businesses || []).map(item => [item.id, item]));
  const ownerIds = [...new Set((businesses || []).map(item => item.owner_id))];

  const ownerLocales = new Map<string, "pt-BR" | "en">();
  await Promise.all(ownerIds.map(async ownerId => {
    const { data } = await client.auth.admin.getUserById(ownerId);
    const locale = data?.user?.user_metadata?.agendaleve_language === "en" ? "en" : "pt-BR";
    ownerLocales.set(ownerId, locale);
  }));

  const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
    client.from("agendaleve_reminder_preferences")
      .select("owner_id,enabled,push_enabled,reminder_minutes")
      .in("owner_id", ownerIds),
    client.from("agendaleve_push_subscriptions")
      .select("id,owner_id,endpoint,p256dh,auth,is_active")
      .in("owner_id", ownerIds)
      .eq("is_active", true),
  ]);

  const preferenceMap = new Map((preferences || []).map(item => [item.owner_id, item]));
  type PushRow = { id: string; owner_id: string; endpoint: string; p256dh: string; auth: string; is_active: boolean };
  const subscriptionsByOwner = new Map<string, PushRow[]>();
  for (const sub of (subscriptions || []) as PushRow[]) {
    const list = subscriptionsByOwner.get(sub.owner_id) || [];
    list.push(sub);
    subscriptionsByOwner.set(sub.owner_id, list);
  }

  let sent = 0;
  let checked = 0;
  for (const booking of bookings) {
    const business = businessMap.get(booking.business_id);
    if (!business) continue;
    const pref = preferenceMap.get(business.owner_id);
    if (!pref?.enabled || !pref?.push_enabled) continue;

    const ownerSubscriptions = subscriptionsByOwner.get(business.owner_id) || [];
    if (!ownerSubscriptions.length) continue;

    for (const reminderMinutes of pref.reminder_minutes || []) {
      checked += 1;
      const dueAt = Date.parse(booking.starts_at) - Number(reminderMinutes) * 60_000;
      if (dueAt > now || dueAt < now - 6 * 60_000) continue;

      const { data: delivery, error: deliveryError } = await client
        .from("agendaleve_reminder_deliveries")
        .insert({
          booking_id: booking.id,
          owner_id: business.owner_id,
          reminder_minutes: Number(reminderMinutes),
          channel: "push",
          status: "pending",
          attempted_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (deliveryError?.code === "23505") continue;
      if (deliveryError || !delivery) continue;

      const locale = ownerLocales.get(business.owner_id) || "pt-BR";
      const lead = Number(reminderMinutes) === 1440
        ? (locale === "en" ? "Tomorrow" : "Amanhã")
        : (locale === "en" ? "In 2 hours" : "Em 2 horas");
      const payload = JSON.stringify({
        title: `${lead}: ${booking.service_name}`,
        body: `${booking.client_name} · ${localTimeLabel(booking.starts_at, business.timezone || "America/Sao_Paulo", locale)}`,
        url: "https://helioconde.github.io/agendaleve/",
        tag: `agendaleve-${booking.id}-${reminderMinutes}`,
      });

      let successes = 0;
      let lastError = "";
      for (const sub of ownerSubscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, payload, { TTL: 3600 });
          successes += 1;
        } catch (error) {
          const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
          lastError = statusCode ? `push_${statusCode}` : "push_error";
          if (statusCode === 404 || statusCode === 410) {
            await client.from("agendaleve_push_subscriptions")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("id", sub.id);
          }
        }
      }

      await client.from("agendaleve_reminder_deliveries")
        .update(successes > 0
          ? { status: "sent", sent_at: new Date().toISOString(), error_code: null }
          : { status: "failed", error_code: lastError || "no_active_subscription" })
        .eq("id", delivery.id);

      sent += successes > 0 ? 1 : 0;
    }
  }

  return json(200, { checked, sent });
});
