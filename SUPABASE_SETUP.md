# AgendaLeve: backend Supabase

O AgendaLeve usa o projeto compartilhado `pizzaria-db`. Todos os objetos do produto têm prefixo `agendaleve_` para evitar colisões com a pizzaria e com outros projetos.

## O que está implantado

- A migration `20261005000000_initial_booking_schema.sql` foi aplicada ao `pizzaria-db`.
- Foram criadas as tabelas de negócios, expediente, serviços, reservas e controle de tentativas. Todas têm RLS habilitado.
- As policies de proprietário e leitura pública estão definidas; grants de acesso via Data API para `anon` e `authenticated` continuam revogados até a integração do frontend ser revisada.
- A Edge Function `create-booking` está publicada e ativa. Ela verifica os dados e a origem, limita o tamanho do pedido e as tentativas, cria um token privado de cancelamento e chama funções do banco usando uma chave de serviço mantida no ambiente Supabase.
- A Edge Function `cancel-booking` permite cancelar reservas futuras sem login usando somente o ID e o token secreto; no banco fica armazenado apenas o hash SHA-256 do token.
- O banco valida o expediente, a duração e os conflitos. Uma restrição impede reservas ativas sobrepostas, inclusive em pedidos simultâneos.
- A interface está conectada ao Supabase Auth e ao backend: proprietário gerencia negócio, expediente, serviços e reservas; visitantes usam o link público; o contato telefônico/WhatsApp da reserva fica privado para o estabelecimento.

## Segurança

- Nunca coloque uma chave secreta ou `service_role` no HTML, JavaScript público ou GitHub.
- A função usa a chave de serviço somente no servidor. O navegador só deverá usar a chave publicável depois que grants e policies específicos forem revisados.
- A função permite atualmente o domínio GitHub Pages do AgendaLeve e servidores locais de desenvolvimento. Atualize `allowedOrigins` se o domínio mudar.
- O limite atual é de cinco tentativas por janela de dez minutos por endereço de rede, guardando somente o hash do endereço. Antes de divulgar amplamente o produto, acrescente CAPTCHA/Turnstile e monitore abuso.

## Próximas etapas

1. Adicionar CAPTCHA/Turnstile antes de divulgação ampla.
2. Adicionar fluxo de reagendamento reutilizando o cancelamento seguro.
3. Adicionar lembretes automáticos.
4. Ampliar QA real com múltiplos proprietários e reservas concorrentes.
5. Validar os novos filtros/status do painel em uso real.

Pagamentos e automações de mensagem ainda não estão implementados.
