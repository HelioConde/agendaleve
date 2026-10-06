# AgendaLeve

Protótipo navegável para organizar serviços e receber reservas de pequenos negócios. O fluxo inclui painel de agenda, configuração de nome/expediente/dias de atendimento, cadastro de serviços com duração e preço, e uma página demonstrativa para o cliente escolher um horário disponível. O expediente inicial é 8h–19h e cada atendimento ocupa a duração configurada para o serviço.

O sistema considera duração e conflitos entre atendimentos, bloqueia horários passados e permite cancelar reservas. A interface ainda usa dados locais; o repositório já inclui uma base Supabase inicial, mas autenticação, sincronização entre dispositivos, reservas públicas, lembretes e pagamentos ainda não estão conectados.

## Rodar localmente

Abra `index.html` em um navegador moderno ou publique como site estático. Os dados de demonstração usam `localStorage` neste navegador.

## Próxima etapa para produção

Consulte [SUPABASE_SETUP.md](SUPABASE_SETUP.md) para preparar e validar a base antes de conectar a interface. Não coloque chaves privadas no código publicado.
