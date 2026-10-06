# Validação beta — AgendaLeve

Atualizado em 2026-10-06.

## Estado

A infraestrutura de validação está pronta. **Isso não significa que o produto já foi validado com usuários reais.** A validação só poderá ser marcada como concluída depois de uso real.

O produto registra somente sinais de produto sem nome/telefone do cliente:

- visualização da página;
- início do formulário;
- reserva concluída;
- abertura do gerenciamento da reserva;
- abertura do painel do proprietário;
- ativação de push;
- feedback enviado.

Os identificadores de sessão são armazenados como hash no backend.

## Rodada recomendada

### Proprietários
Recrutar inicialmente **5 negócios pequenos** que realmente usem agenda/WhatsApp.

Cada proprietário deve tentar, sem orientação passo a passo:

1. criar conta;
2. configurar nome e expediente;
3. cadastrar pelo menos 2 serviços;
4. ativar o link público;
5. compartilhar o link;
6. receber pelo menos 3 reservas;
7. confirmar/concluir/cancelar um atendimento;
8. ativar notificações push;
9. responder o feedback beta.

### Clientes
Buscar pelo menos **20 reservas reais ou testes feitos por pessoas diferentes do proprietário**.

Observar:

- se entendem serviço → data → horário sem ajuda;
- se concluem a reserva;
- se entendem o link para reagendar/cancelar;
- nota de 1 a 5 após a reserva.

## Critérios iniciais de validação

O MVP pode avançar para lançamento controlado quando:

- pelo menos 4 de 5 proprietários configurarem o negócio sem ajuda;
- pelo menos 80% dos clientes que iniciam a reserva conseguirem concluí-la;
- nota média da reserva for >= 4/5;
- nenhum problema crítico de privacidade, conflito de horário ou perda de reserva aparecer;
- pelo menos 3 proprietários disserem que continuariam usando após a rodada.

## O que não coletar

Não adicionar nome, telefone, texto da reserva ou outros dados pessoais à tabela de eventos de produto. Dados operacionais continuam somente nas tabelas privadas de reservas protegidas por RLS.
