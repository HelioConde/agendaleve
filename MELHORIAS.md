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

- [ ] Adicionar proteção externa contra abuso/bots (Turnstile ou equivalente).
- [ ] Criar lembretes automáticos de atendimento.
- [x] Permitir editar serviço sem precisar remover e criar novamente.
- [x] Permitir expediente diferente por dia da semana.
- [x] Adicionar status **não compareceu**.
- [x] Busca de clientes/agendamentos por nome, telefone ou serviço.
- [x] Exportar agenda em CSV.
- [x] Testes E2E em Chromium cobrindo configuração, expediente por dia, criação/edição de serviço, reserva e busca na agenda.

## P2 — evolução do produto

- [ ] Mais de um profissional por negócio.
- [ ] Agenda individual por profissional.
- [ ] Bloqueios/folgas/férias.
- [ ] Serviços com buffers antes/depois.
- [ ] Branding do negócio na página pública.
- [ ] Foto/logo do negócio.
- [ ] Pagamento/sinal opcional.
- [ ] Relatório de comparecimento e cancelamentos.
- [ ] Dashboard de receita estimada.
- [ ] Domínio/link personalizado.
- [ ] PWA/instalação.
- [ ] Notificações push e integrações com calendário.

## Regra de priorização

Antes de adicionar funcionalidades P2, concluir os itens P1 ligados a segurança, edição básica, horários reais e QA. O AgendaLeve deve continuar simples: qualquer melhoria que torne o agendamento mais burocrático deve ser evitada.
