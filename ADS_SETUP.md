# Publicidade — AgendaLeve

O AgendaLeve foi preparado para ser gratuito e monetizado por anúncios, sem exibir planos pagos.

## Princípios de posicionamento

Os anúncios ficam fora das ações críticas:

- **owner-footer**: no final da tela principal do proprietário, substituindo a antiga seção de preços;
- **public-footer**: depois do fluxo principal da página pública de reservas.

Não colocar anúncios:

- entre serviço, data e horário;
- junto ao botão de confirmar reserva;
- dentro do gerenciamento/cancelamento;
- simulando botões ou elementos do AgendaLeve.

## Ativação

O código fica desativado por padrão em `ads-config.js`.

Depois da aprovação da rede de anúncios:

1. informe o `publisherId` no formato `ca-pub-...`;
2. crie duas unidades responsivas;
3. informe os IDs em `ownerFooter` e `publicFooter`;
4. altere `enabled` para `true`.

Enquanto `enabled: false`, o AgendaLeve não carrega o script de anúncios e os slots permanecem ocultos.

## ads.txt

Quando houver um Publisher ID real, publique também o `ads.txt` correto na raiz do site. Não foi criado um registro fictício antes da aprovação para evitar configuração inválida.

## Privacidade e consentimento

Antes de ativar anúncios personalizados em produção, revisar consentimento/cookies e a política de privacidade aplicável à região dos usuários. O carregamento de anúncios está isolado em `ads.js` para facilitar a inclusão de uma camada de consentimento antes da inicialização.
