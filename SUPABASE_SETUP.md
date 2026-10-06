# AgendaLeve: backend Supabase

O AgendaLeve usa o projeto compartilhado `pizzaria-db`. Todos os objetos do produto têm prefixo `agendaleve_` para evitar colisões com a pizzaria e com outros projetos.

## O que está implantado

- A migration `20261005000000_initial_booking_schema.sql` foi aplicada ao `pizzaria-db`.
- Foram criadas as tabelas de negócios, expediente, serviços, reservas e controle de tentativas. Todas têm RLS habilitado.
- As policies de proprietário e leitura pública estão definidas; grants de acesso via Data API para `anon` e `authenticated` continuam revogados até a integração do frontend ser revisada.
- A Edge Function `create-booking` está publicada e ativa. Ela verifica os dados e a origem, limita o tamanho do pedido e as tentativas, e chama funções do banco usando uma chave de serviço mantida no ambiente Supabase.
- O banco valida o expediente, a duração e os conflitos. Uma restrição impede reservas ativas sobrepostas, inclusive em pedidos simultâneos.
- A interface ainda é uma demonstração local: não há cadastro/login, negócios ou serviços geridos pelo painel, catálogo público ou sincronização conectados ao banco.

## Segurança

- Nunca coloque uma chave secreta ou `service_role` no HTML, JavaScript público ou GitHub.
- A função usa a chave de serviço somente no servidor. O navegador só deverá usar a chave publicável depois que grants e policies específicos forem revisados.
- A função permite atualmente o domínio GitHub Pages do AgendaLeve e servidores locais de desenvolvimento. Atualize `allowedOrigins` se o domínio mudar.
- O limite atual é de cinco tentativas por janela de dez minutos por endereço de rede, guardando somente o hash do endereço. Antes de divulgar amplamente o produto, acrescente CAPTCHA/Turnstile e monitore abuso.

## Próximas etapas

1. Implementar cadastro e login com Supabase Auth.
2. Conectar o painel autenticado para criar negócios, expediente, serviços e consultar/cancelar reservas com RLS.
3. Criar a leitura pública mínima de catálogo e disponibilidade sem expor dados de clientes.
4. Ligar o formulário público à função `create-booking`.
5. Testar isolamento entre proprietários, permissões, reserva concorrente e comportamento do formulário antes de divulgar o serviço.

Mensagens automáticas, pagamentos e cancelamento pelo cliente ainda não estão implementados.
