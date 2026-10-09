# AgendaLeve — encerramento técnico do MVP 1.0

**Data:** 09/10/2026  
**Estado:** desenvolvimento principal encerrado; MVP publicado e liberado para **beta controlado**, condicionado à verificação final do ambiente e à validação humana.

## Verificações concluídas

- [x] GitHub Pages publicado: https://helioconde.github.io/agendaleve/
- [x] Static QA, Browser E2E e Live Update QA aprovados após as correções de outubro.
- [x] Browser E2E: **6 de 6 testes aprovados**, incluindo configuração do negócio, edição de serviços, reserva local, relatórios, máscara de telefone, PT-BR/EN e segurança de cache.
- [x] Workflows e navegação PWA ajustados para não apagar caches de outros projetos na mesma origem.
- [x] Páginas com tokens de gerenciamento de reservas e URLs com query strings não são cacheadas no service worker.
- [x] A navegação de notificações está restrita ao escopo do AgendaLeve.
- [x] Supabase: projeto `pizzaria-db` ativo; Edge Functions de reservas, disponibilidade, cancelamento, reagendamento e push marcadas como ACTIVE.
- [x] Banco: 12 tabelas `agendaleve_*` protegidas por RLS; reservas e contatos de clientes sem SELECT para a role `anon`.
- [x] RPCs internas do AgendaLeve não concedem EXECUTE a `anon` ou `authenticated`.
- [x] Tarefa `agendaleve-reminder-dispatch` do banco está ativa, programada de 5 em 5 minutos.

**Evidências de CI**
- [Browser E2E — 6 testes aprovados](https://github.com/HelioConde/agendaleve/actions/runs/37910230423)
- [Static QA](https://github.com/HelioConde/agendaleve/actions/runs/37910230448)
- [Live Update QA](https://github.com/HelioConde/agendaleve/actions/runs/37910230450)
- [GitHub Pages — publicação aprovada](https://github.com/HelioConde/agendaleve/actions/runs/37910243924)

## Pendências externas: não marcar como aprovadas sem evidência

- [ ] **Reserva real em produção:** usar pelo menos dois navegadores/dispositivos e conferir o registro persistido com o proprietário.
- [ ] **Isolamento entre proprietários A e B:** contas reais distintas e tentativa de visualizar/alterar dados alheios.
- [ ] **Turnstile Cloudflare:** configurar a sitekey pública no frontend e a secret somente no Vault; executar a verificação na função de criação de reserva.
- [ ] **Push real:** autorizar notificações num celular físico, realizar reserva e conferir entrega dos lembretes de 24 h/2 h e comportamento sem permissão.
- [ ] **Gerenciamento pelo cliente:** reagendar e cancelar a reserva em outro dispositivo por meio do link privado.
- [ ] **AdSense:** preencher Publisher ID e slots **somente após aprovação**; validar consentimento e política de privacidade antes de ativar anúncios.
- [ ] **Beta humano:** executar os critérios de [VALIDACAO_BETA.md](VALIDACAO_BETA.md) com proprietários e clientes reais.

## Critério de encerramento

Para o portfólio, o desenvolvimento principal do AgendaLeve 1.0 está **concluído**. Isso **não é sinônimo de homologação comercial ampla** nem garante notificações funcionando em todos os dispositivos. O produto pode permanecer em beta controlado, sem novas features P2 até feedback real. Continue acompanhando a [issue #1](https://github.com/HelioConde/agendaleve/issues/1).

## Atenção: Supabase compartilhado

O `pizzaria-db` também atende outros projetos. Foram encontradas advertências de segurança do Supabase referentes a objetos **fora do namespace `agendaleve_`**. Elas devem ser revisadas separadamente com os responsáveis por esses módulos; não corrigir por reflexo alterando tabelas ou funções de outros produtos.

Referências:
- [Documentação Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Security Advisors](https://supabase.com/dashboard/project/bnlvvsjgpywpbfhwdcan/database/security-advisor)
