# AgendaLeve: backend Supabase

O AgendaLeve usa o projeto compartilhado `pizzaria-db`. Todos os objetos do produto têm prefixo `agendaleve_` para evitar colisões com a pizzaria e com outros projetos.

## O que está implantado

- A migration `20261005000000_initial_booking_schema.sql` foi aplicada ao `pizzaria-db`.
- Foram criadas as tabelas de negócios, expediente, serviços, reservas e controle de tentativas. Todas têm RLS habilitado.
- As policies de proprietário e leitura pública estão definidas; grants de acesso via Data API para `anon` e `authenticated` continuam revogados até a integração do frontend ser revisada.
- A Edge Function `create-booking` está publicada e ativa. Ela verifica os dados e a origem, limita o tamanho do pedido e as tentativas, cria um token privado de cancelamento e, quando o segredo Turnstile estiver configurado no Vault, exige validação server-side antes de gravar a reserva.
- A Edge Function `cancel-booking` permite cancelar reservas futuras sem login usando somente o ID e o token secreto; no banco fica armazenado apenas o hash SHA-256 do token.
- O banco valida o expediente, a duração e os conflitos. Uma restrição impede reservas ativas sobrepostas, inclusive em pedidos simultâneos.
- `pg_cron` + `pg_net` chamam `reminder-dispatch` a cada 5 minutos.
- As chaves VAPID privadas e o segredo do cron ficam no Supabase Vault.
- `beta-signal` recebe eventos de produto e feedback sem PII para a rodada beta.
- A interface está conectada ao Supabase Auth e ao backend: proprietário gerencia negócio, expediente, serviços e reservas; visitantes usam o link público; o contato telefônico/WhatsApp da reserva fica privado para o estabelecimento.

## Segurança

- Nunca coloque uma chave secreta ou `service_role` no HTML, JavaScript público ou GitHub.
- A função usa a chave de serviço somente no servidor. O navegador só deverá usar a chave publicável depois que grants e policies específicos forem revisados.
- A função permite atualmente o domínio GitHub Pages do AgendaLeve e servidores locais de desenvolvimento. Atualize `allowedOrigins` se o domínio mudar.
- O limite atual é de cinco tentativas por janela de dez minutos por endereço de rede, guardando somente o hash do endereço.
- A integração Turnstile já chama o Siteverify no servidor quando `agendaleve_turnstile_secret` existir no Vault. A ativação final exige criar um widget real no Cloudflare, colocar a secret no Vault e a sitekey pública em `supabase-config.js`.

## Próximas etapas

1. Criar o widget real do Cloudflare Turnstile e inserir as duas credenciais sem expor a secret.
2. Executar a rodada descrita em `VALIDACAO_BETA.md`.
3. Acompanhar falhas de entrega de push e subscriptions expiradas.
4. Validar com múltiplos proprietários e reservas concorrentes em uso real.

Pagamentos e integrações externas de calendário ainda não estão implementados.
