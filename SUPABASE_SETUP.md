# AgendaLeve: backend Supabase

O protótipo público continua usando dados locais até um projeto próprio do AgendaLeve ser configurado.

## Modelo incluído

- Negócios, expediente por dia, serviços e reservas com isolamento por proprietário via RLS.
- As policies de leitura pública e de propriedade estão definidas, mas os grants de API para `anon` e `authenticated` permanecem revogados nesta etapa. Nenhuma tabela fica acessível pelo Data API até a integração ser revisada.
- Dados de clientes e tabela de controle de tentativas não são legíveis pela API pública.
- A reserva pública é processada pela Edge Function `create-booking`; o navegador nunca recebe a chave de serviço.
- O banco valida expediente, duração e conflitos. Uma restrição de exclusão impede duas reservas ativas sobrepostas, inclusive em chamadas simultâneas.
- A função limita cada endereço de rede a cinco tentativas por janela de dez minutos e armazena apenas o hash do endereço.

## Implantação

1. Crie um projeto Supabase dedicado ao AgendaLeve. Não use projetos de outros produtos.
2. Configure a CLI e aplique a migration em `supabase/migrations` usando o fluxo de migrations do Supabase.
3. Publique `create-booking`. A função prefere a chave `default` de `SUPABASE_SECRET_KEYS` e mantém compatibilidade temporária com `SUPABASE_SERVICE_ROLE_KEY`. Nunca copie uma chave secreta para os arquivos do site ou para o GitHub.
4. Adicione seu domínio de produção a `allowedOrigins` em `supabase/functions/create-booking/index.ts`.
5. Revise os advisors de segurança, teste RLS com usuários diferentes e teste duas reservas concorrentes antes de conectar a interface.
6. Antes de conectar a interface, aplique os grants mínimos necessários: leitura anônima somente das colunas públicas de negócios, serviços e horários; acesso autenticado condicionado às policies RLS para o painel. Hoje ambos estão revogados de propósito.
7. Depois dos grants e testes, integrar cadastro/login, painel autenticado e formulário público com a URL do projeto e uma chave publicável.

## Limites atuais

Ainda não há conexão ativa nem variáveis de projeto neste repositório. A interface publicada continua em modo demonstração. A proteção por IP é uma camada simples de contenção; antes de divulgação pública, adicione CAPTCHA/Turnstile e monitore tentativas abusivas. Mensagens automáticas, pagamento e cancelamento pelo cliente ainda não estão implementados.
