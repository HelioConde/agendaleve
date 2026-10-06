// Configuração pública do Supabase para o AgendaLeve.
// A publishable key é segura para frontend quando RLS está corretamente configurado.
(() => {
  const sdk = window.supabase;
  if (!sdk?.createClient) {
    window.AGENDALEVE_SUPABASE = { client: null };
    return;
  }
  window.AGENDALEVE_SUPABASE = {
    client: sdk.createClient(
      'https://bnlvvsjgpywpbfhwdcan.supabase.co',
      'sb_publishable_8q954VgGB7IUEgwWYA55-Q_MUyDd17c',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    ),
    functionUrl: 'https://bnlvvsjgpywpbfhwdcan.supabase.co/functions/v1/create-booking',
    availabilityUrl: 'https://bnlvvsjgpywpbfhwdcan.supabase.co/functions/v1/booking-availability'
  };
})();
