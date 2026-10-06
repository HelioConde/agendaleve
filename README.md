# AgendaLeve

Agenda online para pequenos negócios, com painel do proprietário e página pública de reservas.

## Estado atual

- modo local sem conta;
- Supabase Auth;
- negócio, expediente por dia da semana, serviços e reservas persistidos no `pizzaria-db`;
- link público por `?negocio=slug`;
- experiência separada entre painel do negócio e página do cliente;
- resumo vivo da reserva com serviço, duração, preço, data e horário;
- disponibilidade em tempo real;
- telefone/WhatsApp privado por reserva para retorno do estabelecimento;
- filtros da agenda por período e status;
- busca da agenda por cliente, telefone ou serviço;
- exportação da agenda em CSV;
- ações rápidas para confirmar, concluir, marcar não comparecimento e cancelar atendimentos;
- edição de serviços existentes sem precisar recriar;
- cancelamento seguro pelo cliente através de link privado com token;
- reagendamento pelo próprio cliente, sem login e sem expor dados privados;
- consulta de disponibilidade que desconsidera a própria reserva durante o reagendamento;
- Edge Function `booking-availability` sem exposição de dados privados;
- Edge Function `create-booking` com validação, rate limit, token de cancelamento e prevenção de conflitos;
- Edge Function `cancel-booking` para cancelamento sem login, validado por token;
- Edge Functions `booking-manage` e `reschedule-booking` para gestão segura da reserva pelo cliente;
- RLS separando proprietário, visitante público e reservas privadas;
- GitHub Pages + CI;
- lembretes automáticos por Web Push (24h/2h) com cron do Supabase;
- preferências e subscriptions push protegidas por RLS;
- instrumentação beta sem PII e feedback 1–5;
- integração Turnstile pronta para ativação com credenciais reais;
- SEO básico.

## Idiomas

- **PT-BR** é o idioma principal, padrão e fallback.
- **English (EN)** está disponível pelo seletor no topo.
- A preferência fica salva no navegador.
- Fluxos principais, mensagens, estados dinâmicos, datas e valores acompanham o idioma ativo.
- Conteúdo cadastrado pelo usuário, como nomes de clientes, serviços e negócios, não é traduzido automaticamente.

## Backend

Tabelas:
- `agendaleve_businesses`
- `agendaleve_business_hours`
- `agendaleve_services`
- `agendaleve_bookings`
- `agendaleve_booking_rate_limits`
- `product_subscriptions`

As migrations e Edge Functions ficam em `supabase/`. Consulte também `SUPABASE_SETUP.md` e `FULLSTACK.md`.


## Design system

A identidade visual usa uma paleta de alto contraste e baixa saturação:

- verde floresta `#1F6A4A` para marca e ações principais;
- verde profundo `#164B36` / `#103C2A` para títulos e estados fortes;
- fundo neutro `#F5F6F2` para reduzir fadiga visual;
- sálvia `#E7F0EA` para superfícies secundárias;
- areia `#F1ECE2` como contraste quente discreto;
- âmbar `#B5792A` apenas para pequenos sinais de atenção/status.

O painel e a página pública compartilham os mesmos tokens, mas a página de reserva usa contraste mais suave para manter foco no formulário.


## Roadmap

A lista priorizada de melhorias e o estado de implementação ficam em [MELHORIAS.md](./MELHORIAS.md).


## QA

O repositório possui duas camadas automáticas:

- **Static QA:** sintaxe JavaScript, arquivos obrigatórios, integrações e marcadores críticos;
- **Browser E2E:** Playwright + Chromium cobrindo configuração do negócio, expediente por dia, criação/edição de serviço, reserva local e consulta na agenda.

Execute localmente com `npm install` e `npm run test:e2e`.


## Push e lembretes

O proprietário pode ativar Web Push explicitamente no navegador e escolher lembretes de 24 horas e/ou 2 horas antes. O despacho roda a cada 5 minutos via `pg_cron` + `pg_net` e a Edge Function `reminder-dispatch`. As chaves privadas VAPID e o segredo do cron ficam no Supabase Vault, nunca no frontend.

## Validação beta

Consulte [VALIDACAO_BETA.md](./VALIDACAO_BETA.md). O produto já coleta eventos de funil e feedback sem PII, mas validação real só será considerada concluída depois da rodada com pessoas reais.


## PWA e operação beta

O AgendaLeve é instalável como PWA quando o navegador oferece o prompt. O service worker mantém o shell básico disponível e também recebe notificações push. Proprietários autenticados podem enviar uma notificação de teste e acompanhar, no painel beta, reservas iniciadas, concluídas, conversão e nota média dos últimos 30 dias.


## Monetização por anúncios

O modelo de planos/preços foi removido. O AgendaLeve está preparado para permanecer gratuito e usar anúncios responsivos em posições não críticas. A integração fica desativada até existirem Publisher ID e slots reais; consulte [ADS_SETUP.md](./ADS_SETUP.md).
