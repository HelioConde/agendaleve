# AgendaLeve

Protótipo navegável para organizar serviços e receber reservas de pequenos negócios. O fluxo inclui painel de agenda, configuração de nome/expediente/dias de atendimento, cadastro de serviços com duração e preço, e uma página demonstrativa para o cliente escolher um horário disponível. O expediente inicial é 8h–19h e cada atendimento ocupa a duração configurada para o serviço.

O sistema considera duração e conflitos entre atendimentos, bloqueia horários passados e permite cancelar reservas. Os dados ainda ficam somente no navegador: contas, sincronização entre dispositivos, link público funcional, lembretes, pagamentos e backend não estão conectados.

## Rodar localmente

Abra `index.html` em um navegador moderno ou publique como site estático. Os dados de demonstração usam `localStorage` neste navegador.

## Próxima etapa para produção

Conectar autenticação e banco de dados multiempresa, expor uma página pública por negócio e enviar confirmações. Não coloque chaves privadas no código publicado.
