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

  const { data: serverConfig, error: configError } = await client.rpc("agendaleve_get_server_config");
  if (configError || !serverConfig?.vapid_public_key || !serverConfig?.vapid_private_key) {
    return json(503, { error: "Push não configurado." });
  }

  webpush.setVapidDetails(
    String(serverConfig.vapid_subject || "https://helioconde.github.io/agendaleve/"),
    String(serverConfig.vapid_public_key),
    String(serverConfig.vapid_private_key),
  );

  const { data: subscriptions, error: subscriptionsError } = await client
    .from("agendaleve_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("owner_id", user.id)
    .eq("is_active", true);

  if (subscriptionsError) return json(503, { error: "Não foi possível consultar notificações." });
  if (!subscriptions?.length) return json(409, { error: "Ative as notificações neste navegador primeiro." });

  const payload = JSON.stringify({
    title: "Teste do AgendaLeve",
    body: "Se você recebeu esta notificação, o push está funcionando.",
    url: "https://helioconde.github.io/agendaleve/",
    tag: "agendaleve-push-test",
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload, { TTL: 300 });
      sent += 1;
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        await client.from("agendaleve_push_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
    }
  }

  if (!sent) return json(503, { error: "Nenhuma notificação de teste foi entregue." });
  return json(200, { sent });
});
