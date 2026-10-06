# AgendaLeve

Protótipo navegável para organizar serviços e receber reservas de pequenos negócios. O fluxo inclui painel de agenda, configuração de nome/expediente/dias de atendimento, cadastro de serviços com duração e preço, e uma página demonstrativa para o cliente escolher um horário disponível.

## Estado atual

O esquema do AgendaLeve está aplicado no projeto Supabase compartilhado `pizzaria-db`, com tabelas isoladas pelo prefixo `agendaleve_`. A Edge Function `create-booking` está publicada para validar e registrar reservas sem expor a chave de serviço.

A interface publicada ainda usa dados locais neste navegador. Cadastro/login, sincronização, configuração de negócios e catálogo público ainda não estão conectados ao Supabase. A publicação da função, portanto, não significa que a página já esteja recebendo reservas reais.

## Rodar localmente

Abra `index.html` em um navegador moderno ou publique como site estático. A demonstração atual guarda os dados em `localStorage`.

## Próxima etapa

Conectar cadastro e login, painel do proprietário e catálogo/horários públicos. Depois, substituir o fluxo demonstrativo pelo endpoint de reserva. Consulte [SUPABASE_SETUP.md](SUPABASE_SETUP.md) para o estado do backend e as etapas restantes.

Não coloque chaves privadas no código publicado.
