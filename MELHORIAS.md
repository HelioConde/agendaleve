# Melhorias — AgendaLeve

Atualizado em 2026-10-06.

Este documento é o backlog de produto, UX/UI, QA e crescimento do AgendaLeve.

## P0 — aplicado

- [x] Corrigir o resumo de data da reserva: a função era assíncrona sem necessidade e podia renderizar `[object Promise]`.
- [x] Criar onboarding visual do proprietário com 3 etapas: negócio, serviço e publicação.
- [x] Colocar o compartilhamento do link público diretamente no dashboard.
- [x] Melhorar o estado vazio da agenda com CTA para criar o primeiro atendimento.
- [x] Mostrar **Grátis** em serviços com valor zero em vez de `R$ 0,00`.
- [x] Aplicar máscara amigável no telefone durante a digitação.
- [x] Separar melhor o painel do negócio da página pública do cliente.
- [x] Criar resumo vivo da reserva com serviço, preço, duração, data e horário.
- [x] Reavaliar a paleta e aumentar hierarquia/contraste.
- [x] Adicionar dados estruturados `SoftwareApplication` para SEO.

## P1 — aplicado

- [x] Tornar as abas mais utilizáveis no mobile com comportamento sticky.
- [x] Respeitar `prefers-reduced-motion` para acessibilidade.
- [x] Melhorar foco visível de teclado.
- [x] Permitir confirmar, concluir e cancelar no painel.
- [x] Filtros por período e status.
- [x] Cancelamento e reagendamento seguros pelo cliente sem login.
- [x] WhatsApp privado por reserva.

## P1 — próximos

- [ ] Ativar Turnstile em produção. **Integração cliente+servidor pronta; falta criar o widget Cloudflare e inserir sitekey/secret reais.**
- [x] Criar lembretes automáticos por push, com opções de 24h e 2h e despacho agendado no Supabase.
- [x] Permitir editar serviço sem precisar remover e criar novamente.
- [x] Permitir expediente diferente por dia da semana.
- [x] Adicionar status **não compareceu**.
- [x] Busca de clientes/agendamentos por nome, telefone ou serviço.
- [x] Exportar agenda em CSV.
- [x] Testes E2E em Chromium cobrindo configuração, expediente por dia, criação/edição de serviço, reserva e busca na agenda.

## Validação com usuários reais

- [x] Instrumentação de funil e feedback sem PII.
- [x] Formulário de feedback para proprietário e cliente.
- [x] Plano de validação documentado em `VALIDACAO_BETA.md`.
- [ ] Executar a primeira rodada com 5 proprietários e pelo menos 20 reservas feitas por pessoas reais.
- [ ] Revisar métricas e feedback antes do lançamento amplo.

## P2 — evolução do produto

- [ ] Mais de um profissional por negócio.
- [ ] Agenda individual por profissional.
- [ ] Bloqueios/folgas/férias.
- [ ] Serviços com buffers antes/depois.
- [ ] Branding do negócio na página pública.
- [ ] Foto/logo do negócio.
- [ ] Pagamento/sinal opcional.
- [x] Relatório de comparecimento e cancelamentos, com resumo dos últimos 30 dias.
- [x] Dashboard de receita estimada com base em atendimentos concluídos nos últimos 30 dias.
- [ ] Domínio/link personalizado.
- [x] PWA/instalação com manifest, service worker, cache de shell e prompt de instalação.
- [x] Notificações push web opt-in para lembretes.
- [x] Teste de push pelo painel.
- [x] Métricas beta dos últimos 30 dias no painel do proprietário.
- [ ] Integrações com calendário.

## Regra de priorização

Antes de adicionar funcionalidades P2, concluir os itens P1 ligados a segurança, edição básica, horários reais e QA. O AgendaLeve deve continuar simples: qualquer melhoria que torne o agendamento mais burocrático deve ser evitada.
