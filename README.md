<div align="center">
  <h1>📅 AgendaLeve</h1>
  <p><strong>Agenda online para profissionais e pequenos negócios, com reservas e horários organizados.</strong></p>
  <p><img alt="Beta controlado" src="https://img.shields.io/badge/status-beta%20controlado-64748b"> <img alt="Web" src="https://img.shields.io/badge/plataforma-web-2563eb"></p>
  <p><a href="RELEASE_V1.md"><strong>Relatório 1.0</strong></a> · <a href="VALIDACAO_BETA.md"><strong>Validação</strong></a> · <a href="FULLSTACK.md"><strong>Arquitetura</strong></a></p>
</div>

---

## Do agendamento à confirmação

O **AgendaLeve** organiza a rotina de atendimento: o estabelecimento configura seus serviços e horários, compartilha sua página de reservas e acompanha o calendário em um painel próprio. A primeira versão está **tecnicamente concluída para beta controlado**, mas o uso comercial amplo depende de homologação e integrações externas.

```text
Negócio cria serviços e define disponibilidade
                       ↓
            Compartilha o link público
                       ↓
       Cliente escolhe serviço, data e horário
                       ↓
        Reserva registrada e acompanhada
                       ↓
  Confirmação · Reagendamento · Cancelamento
```

## Funcionalidades

| Quem utiliza | Recursos principais |
| --- | --- |
| **Negócio** | Cadastro de serviços, expediente, folgas, bloqueios e identidade da página |
| **Cliente** | Reserva pelo link público, resumo de preço e duração, reagendamento e cancelamento por link privado |
| **Gestão** | Agenda com filtros e busca, mudanças de status, faltas e conclusão |
| **Relatórios** | Resumo operacional dos últimos 30 dias e exportação CSV |
| **Calendário** | Exportação `.ics` de reservas confirmadas |
| **Conta** | Modo local para demonstração e autenticação Supabase para persistência remota |
| **Interface** | Português e inglês, PWA e experiência responsiva |

Os horários reais dependem de disponibilidade, configurações da loja e integridade do backend. Teste permissões antes de permitir acesso a dados de clientes.

## Executar localmente

**Pré-requisitos:** Python 3 (ou outro servidor HTTP estático) e navegador moderno.

```bash
git clone https://github.com/HelioConde/agendaleve.git
cd agendaleve
python -m http.server 8000
```

Abra `http://localhost:8000`. O modo de demonstração pode funcionar sem conta; as operações remotas exigem um projeto Supabase preparado conforme [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Para os testes de navegador declarados no `package.json`:

```bash
npm install
npx playwright install
npm run test:e2e
```

Também há `npm run screenshots` para capturas. **Estes comandos não foram executados nesta atualização do README.**

## Arquitetura e dados

O frontend é uma aplicação web estática com integração ao **Supabase Auth, banco de dados e Edge Functions**. As reservas, dados de contato e recursos privados devem ser isolados por **RLS e verificações no servidor**, nunca apenas por filtros no JavaScript do navegador.

O projeto contém fluxos de calendário e página pública do negócio, com sincronização opcional. Recursos de push, permissões e notificações exigem configuração real e consentimento adequado.

## Status e próximos passos

**v1.0 — desenvolvimento principal concluído; beta controlado.** O histórico técnico relata verificações de CI, PWA, backend e fluxos críticos nas datas originais. Isso **não substitui** confirmar os testes e as integrações no momento de implantação.

- [Relatório da versão](RELEASE_V1.md)
- [Checklist de validação humana](VALIDACAO_BETA.md)
- [Arquitetura e integração](FULLSTACK.md)
- [Documentação histórica completa](docs/README_HISTORY_2026-10-27.md)
- [Pendências de homologação](https://github.com/HelioConde/agendaleve/issues/1)

**Próxima prioridade:** validar a jornada com negócios e clientes reais usando dados de teste controlados, revisar disponibilidade, proteção de contatos e regras de cancelamento.

---

<div align="center"><strong>Desenvolvido por <a href="https://github.com/HelioConde">Hélio Conde</a></strong></div>
