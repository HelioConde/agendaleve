(() => {
  const storageKey = 'agendaleve-language';
  const translations = {
  "Modo local": "Local mode",
  "Entrar / sincronizar": "Sign in / sync",
  "CONTA DO NEGÓCIO": "BUSINESS ACCOUNT",
  "Sincronize sua agenda": "Sync your schedule",
  "Entre para salvar serviços, horários e reservas na nuvem. Sem conta, o modo demonstrativo continua funcionando neste dispositivo.": "Sign in to save services, hours, and bookings in the cloud. Without an account, demo mode keeps working on this device.",
  "E-mail": "Email",
  "Senha": "Password",
  "Entrar": "Sign in",
  "Criar conta": "Create account",
  "Esqueci a senha": "Forgot password",
  "Conectado como": "Signed in as",
  "Sair da conta": "Sign out",
  "AGENDA ONLINE PARA NEGÓCIOS LOCAIS": "ONLINE SCHEDULING FOR LOCAL BUSINESSES",
  "Mais tempo atendendo.": "More time serving clients.",
  "Menos tempo organizando.": "Less time organizing.",
  "Configure seus serviços e horários. Compartilhe seu link e deixe seus clientes reservarem um atendimento sem trocar várias mensagens.": "Set up your services and hours. Share your link and let clients book without exchanging endless messages.",
  "Meu negócio": "My business",
  "Uma agenda mais clara para você e seus clientes.": "A clearer schedule for you and your clients.",
  "Reservar horário": "Book an appointment",
  "Você está na página pública de reservas deste negócio.": "You are on this business's public booking page.",
  "Criar minha agenda": "Create my schedule",
  "Minha agenda": "My schedule",
  "Página do cliente": "Client page",
  "Configurar negócio": "Business settings",
  "PAINEL DO NEGÓCIO": "BUSINESS DASHBOARD",
  "Visão geral": "Overview",
  "Copiar link público": "Copy public link",
  "+ Agendar cliente": "+ Book client",
  "Próximos atendimentos": "Upcoming appointments",
  "horários futuros": "future appointments",
  "Serviços ativos": "Active services",
  "disponíveis para reserva": "available for booking",
  "Expediente": "Business hours",
  "horário de atendimento": "service hours",
  "PRIMEIROS PASSOS": "GETTING STARTED",
  "Deixe sua agenda pronta para receber clientes": "Get your schedule ready to receive clients",
  "Complete a configuração para liberar seu link público.": "Complete setup to enable your public link.",
  "Identifique seu negócio": "Identify your business",
  "Nome e expediente definidos.": "Name and business hours set.",
  "Cadastre um serviço": "Add a service",
  "Duração e preço claros para o cliente.": "Clear duration and pricing for clients.",
  "Publique o link": "Publish the link",
  "Entre na conta e ative reservas públicas.": "Sign in and enable public bookings.",
  "Continuar configuração": "Continue setup",
  "Agenda": "Schedule",
  "Reservas confirmadas e pendentes.": "Confirmed and pending bookings.",
  "Buscar": "Search",
  "Período": "Period",
  "Próximas": "Upcoming",
  "Hoje": "Today",
  "Passadas": "Past",
  "Todas": "All",
  "Status": "Status",
  "Ativas": "Active",
  "Pendentes": "Pending",
  "Confirmadas": "Confirmed",
  "Concluídas": "Completed",
  "Não compareceu": "No-show",
  "Canceladas": "Canceled",
  "Todos": "All",
  "Exportar CSV": "Export CSV",
  "PÁGINA DO CLIENTE": "CLIENT PAGE",
  "Escolha seu atendimento": "Choose your service",
  "Reservas para": "Bookings for",
  "Selecione um serviço, uma data e um horário livre.": "Select a service, date, and available time.",
  "Serviço": "Service",
  "Data": "Date",
  "Horário disponível": "Available time",
  "Seu nome": "Your name",
  "WhatsApp / telefone": "WhatsApp / phone",
  "Usado somente pelo estabelecimento para falar sobre esta reserva.": "Used only by the business to contact you about this booking.",
  "Confirmar reserva": "Confirm booking",
  "No modo local, a reserva fica somente neste navegador.": "In local mode, the booking stays only in this browser.",
  "RESUMO DA RESERVA": "BOOKING SUMMARY",
  "Escolha um serviço": "Choose a service",
  "Selecione o atendimento, a data e um horário para conferir tudo antes de reservar.": "Select the service, date, and time to review everything before booking.",
  "Duração": "Duration",
  "Valor": "Price",
  "Escolha uma data": "Choose a date",
  "Horário": "Time",
  "RESERVA CONFIRMADA": "BOOKING CONFIRMED",
  "Seu horário está reservado!": "Your appointment is booked!",
  "Mensagem pronta para enviar": "Ready-to-send message",
  "Copiar mensagem": "Copy message",
  "Abrir WhatsApp": "Open WhatsApp",
  "Precisa cancelar depois?": "Need to cancel later?",
  "Guarde este link privado. Ele permite cancelar a reserva sem entrar em uma conta.": "Save this private link. It lets you manage the booking without signing in.",
  "Copiar link": "Copy link",
  "Gerenciar reserva": "Manage booking",
  "Como foi fazer a reserva?": "How was the booking experience?",
  "Uma nota rápida ajuda a melhorar o AgendaLeve.": "A quick rating helps improve AgendaLeve.",
  "Enviar feedback": "Send feedback",
  "Fazer outro agendamento →": "Book another appointment →",
  "Publicidade": "Advertisement",
  "GERENCIAR RESERVA": "MANAGE BOOKING",
  "Gerencie seu horário": "Manage your appointment",
  "Carregando os dados da sua reserva…": "Loading your booking details…",
  "Reserva atual": "Current booking",
  "Nova data": "New date",
  "Novo horário": "New time",
  "Confirmar novo horário": "Confirm new time",
  "Não vai conseguir comparecer?": "Can't make it?",
  "Cancelar minha reserva": "Cancel my booking",
  "Voltar para a agenda": "Back to booking page",
  "COMECE POR AQUI": "START HERE",
  "Configure seu negócio": "Set up your business",
  "Publique seu link de reservas": "Publish your booking link",
  "Entre na sua conta para sincronizar e compartilhar uma página pública com seus clientes.": "Sign in to sync and share a public booking page with your clients.",
  "Link público": "Public link",
  "Salve as configurações para gerar seu link.": "Save your settings to generate your link.",
  "Informações e expediente": "Business details and hours",
  "Defina como seu negócio aparece e em quais horários atende.": "Define how your business appears and when it is available.",
  "Nome do negócio": "Business name",
  "Intervalo entre opções de horário": "Time slot interval",
  "15 minutos": "15 minutes",
  "30 minutos": "30 minutes",
  "45 minutos": "45 minutes",
  "1 hora": "1 hour",
  "Expediente por dia": "Business hours by day",
  "Ative somente os dias em que atende e ajuste abertura e fechamento individualmente.": "Enable only the days you work and set opening and closing times for each day.",
  "Segunda": "Monday",
  "Terça": "Tuesday",
  "Quarta": "Wednesday",
  "Quinta": "Thursday",
  "Sexta": "Friday",
  "Sábado": "Saturday",
  "Domingo": "Sunday",
  "Abre": "Opens",
  "Fecha": "Closes",
  "Aceitar reservas pelo link público": "Accept bookings through the public link",
  "Seu negócio e os serviços ativos poderão ser vistos por quem tiver o link.": "Your business and active services will be visible to anyone with the link.",
  "Salvar informações": "Save details",
  "Serviços oferecidos": "Services offered",
  "A duração define quanto tempo cada reserva ocupa na agenda.": "Duration defines how much time each booking takes in the schedule.",
  "Nome do serviço": "Service name",
  "15 min": "15 min",
  "30 min": "30 min",
  "45 min": "45 min",
  "1h30": "1h30",
  "2 horas": "2 hours",
  "Preço (R$)": "Price (R$)",
  "Adicionar serviço": "Add service",
  "Cancelar edição": "Cancel editing",
  "Lembretes e notificações": "Reminders and notifications",
  "Receba um push antes dos próximos atendimentos.": "Receive a push notification before upcoming appointments.",
  "Beta": "Beta",
  "As notificações são opcionais e ficam vinculadas à sua conta neste navegador.": "Notifications are optional and linked to your account in this browser.",
  "24 horas antes": "24 hours before",
  "Bom para se preparar para o dia seguinte.": "Good for preparing for the next day.",
  "2 horas antes": "2 hours before",
  "Último aviso antes do atendimento.": "Final reminder before the appointment.",
  "Ativar notificações": "Enable notifications",
  "Desativar notificações": "Disable notifications",
  "Enviar teste": "Send test",
  "Salvar lembretes": "Save reminders",
  "Instalar app": "Install app",
  "Entre na sua conta para ativar o push.": "Sign in to enable push notifications.",
  "Programa beta": "Beta program",
  "Validação com uso real, sem coletar dados do cliente.": "Real-use validation without collecting client data.",
  "Feedback": "Feedback",
  "Inícios": "Starts",
  "reservas iniciadas": "bookings started",
  "reservas finalizadas": "bookings completed",
  "Conversão": "Conversion",
  "início → conclusão": "start → completion",
  "Nota média": "Average rating",
  "sem avaliações": "no ratings",
  "De 1 a 5, como está sendo usar o AgendaLeve?": "From 1 to 5, how is your experience using AgendaLeve?",
  "Escolha uma nota": "Choose a rating",
  "1 — ruim": "1 — poor",
  "3 — razoável": "3 — fair",
  "5 — ótimo": "5 — great",
  "O que mais te atrapalhou ou ajudou?": "What helped or got in your way the most?",
  "Enviar feedback beta": "Send beta feedback",
  "AGENDALEVE GRATUITO": "AGENDALEVE FREE",
  "Ferramentas completas sem assinatura.": "Complete tools with no subscription.",
  "O AgendaLeve será mantido por anúncios discretos em áreas que não atrapalham o agendamento nem o trabalho do negócio.": "AgendaLeve will be supported by discreet ads placed where they do not interfere with booking or business operations.",
  "Modo local disponível sem conta. Ao entrar, sua agenda é sincronizada no backend protegido por RLS.": "Local mode is available without an account. When you sign in, your schedule syncs to the RLS-protected backend.",
  "AgendaLeve, início": "AgendaLeve, home",
  "Fechar": "Close",
  "Seções do AgendaLeve": "AgendaLeve sections",
  "Resumo da agenda": "Schedule summary",
  "Filtros da agenda": "Schedule filters",
  "Cliente, telefone ou serviço": "Client, phone, or service",
  "Ex.: Marina Souza": "E.g. Marina Smith",
  "Proteção anti-bot": "Anti-bot protection",
  "Resumo da reserva": "Booking summary",
  "Nota da experiência": "Experience rating",
  "Comentário opcional": "Optional comment",
  "Ex.: Corte de cabelo": "E.g. Haircut",
  "Antecedência dos lembretes": "Reminder timing",
  "Métricas do beta nos últimos 30 dias": "Beta metrics for the last 30 days",
  "Grátis": "Free",
  "Horários por dia": "Hours vary by day",
  "Pendente": "Pending",
  "Confirmada": "Confirmed",
  "Concluída": "Completed",
  "Cancelada": "Canceled",
  "Reserva": "Booking",
  "Nenhum serviço cadastrado": "No services added",
  "Adicione ao menos um serviço para receber reservas.": "Add at least one service to receive bookings.",
  "Consultando horários…": "Checking available times…",
  "Nenhum horário disponível": "No times available",
  "Não foi possível consultar agora": "Could not check availability right now",
  "Sem atendimento": "Closed",
  "Minha conta": "My account",
  "Sincronizando…": "Syncing…",
  "conectado": "connected",
  "Nuvem": "Cloud",
  "Conta conectada": "Connected account",
  "A proteção anti-bot não carregou. Tente atualizar a página.": "Anti-bot protection did not load. Try refreshing the page.",
  "Agenda exportada em CSV.": "Schedule exported as CSV.",
  "Agenda indisponível": "Schedule unavailable",
  "AgendaLeve instalado.": "AgendaLeve installed.",
  "Agora escolha uma data para consultar os horários disponíveis.": "Now choose a date to check available times.",
  "Ainda não há agendamentos para exportar.": "There are no bookings to export yet.",
  "Ative o link público e salve primeiro.": "Enable the public link and save first.",
  "Cadastre ou escolha um serviço para começar.": "Add or choose a service to get started.",
  "Cancelar definitivamente esta reserva?": "Permanently cancel this booking?",
  "Configurações sincronizadas.": "Settings synced.",
  "Confira os dados ao lado e preencha seu nome e telefone para reservar.": "Review the details and enter your name and phone number to book.",
  "Confirme a verificação anti-bot antes de reservar.": "Complete the anti-bot verification before booking.",
  "Confirme seu e-mail antes de entrar.": "Confirm your email before signing in.",
  "Conta conectada.": "Account connected.",
  "Criando conta…": "Creating account…",
  "E-mail ou senha incorretos.": "Incorrect email or password.",
  "Entrando…": "Signing in…",
  "Entre na conta para participar do beta.": "Sign in to participate in the beta.",
  "Entre na conta primeiro.": "Sign in first.",
  "Entre na sua conta para salvar lembretes.": "Sign in to save reminders.",
  "Enviando…": "Sending…",
  "Escolha pelo menos um lembrete.": "Choose at least one reminder.",
  "Escolha um horário disponível para concluir a reserva.": "Choose an available time to complete the booking.",
  "Escolha um horário disponível.": "Choose an available time.",
  "Escolha um serviço disponível.": "Choose an available service.",
  "Escolha uma nota de 1 a 5.": "Choose a rating from 1 to 5.",
  "Esse horário pode ter acabado de ser reservado. Escolha outro.": "That time may have just been booked. Choose another.",
  "Esta reserva não pode mais ser cancelada por este link.": "This booking can no longer be canceled with this link.",
  "Este e-mail já possui conta.": "This email already has an account.",
  "Este link de reservas não está disponível.": "This booking link is not available.",
  "Este link pode ter expirado, a reserva pode ter sido cancelada ou o horário já passou.": "This link may have expired, the booking may have been canceled, or the appointment time may have passed.",
  "Este navegador não oferece notificações push.": "This browser does not support push notifications.",
  "Fazer novo agendamento →": "Book another appointment →",
  "Informações salvas neste dispositivo.": "Information saved on this device.",
  "Informe seu e-mail primeiro.": "Enter your email first.",
  "Informe um e-mail e uma senha com pelo menos 8 caracteres.": "Enter an email and a password with at least 8 characters.",
  "Informe um WhatsApp ou telefone válido com DDD.": "Enter a valid WhatsApp or phone number with area code.",
  "Lembretes salvos.": "Reminders saved.",
  "Link de cancelamento copiado.": "Cancellation link copied.",
  "Link público copiado.": "Public link copied.",
  "Mensagem de confirmação copiada.": "Confirmation message copied.",
  "Não foi possível adicionar o serviço.": "Could not add the service.",
  "Não foi possível alterar as notificações.": "Could not change notifications.",
  "Não foi possível atualizar o agendamento.": "Could not update the booking.",
  "Não foi possível atualizar o serviço.": "Could not update the service.",
  "Não foi possível carregar sua agenda.": "Could not load your schedule.",
  "Não foi possível concluir. Confira os dados e tente novamente.": "Could not complete the action. Check the details and try again.",
  "Não foi possível concluir. Revise a verificação e o horário e tente novamente.": "Could not complete the booking. Review the verification and time, then try again.",
  "Não foi possível conectar ao serviço de reservas.": "Could not connect to the booking service.",
  "Não foi possível copiar o link.": "Could not copy the link.",
  "Não foi possível copiar. Selecione e copie a mensagem.": "Could not copy automatically. Select and copy the message.",
  "Não foi possível enviar agora.": "Could not send right now.",
  "Não foi possível enviar o teste. Ative o push neste navegador.": "Could not send the test. Enable push notifications in this browser.",
  "Não foi possível remover o serviço.": "Could not remove the service.",
  "Não foi possível salvar na nuvem.": "Could not save to the cloud.",
  "Não foi possível salvar os lembretes.": "Could not save reminders.",
  "Não foi possível verificar a sessão.": "Could not verify the session.",
  "Notificações ativadas.": "Notifications enabled.",
  "Notificações desativadas neste navegador.": "Notifications disabled in this browser.",
  "O horário foi liberado. Se precisar, você pode fazer um novo agendamento.": "The time slot was released. You can make a new booking if needed.",
  "Obrigado! Feedback registrado.": "Thank you! Feedback submitted.",
  "Os horários são consultados em tempo real e a reserva é validada no servidor.": "Times are checked in real time and the booking is validated on the server.",
  "Parte da agenda não pôde ser carregada.": "Part of the schedule could not be loaded.",
  "Push ainda não está configurado.": "Push notifications are not configured yet.",
  "Push ativo neste navegador.": "Push notifications are active in this browser.",
  "Remover este serviço das próximas reservas? Os atendimentos já marcados serão mantidos.": "Remove this service from future bookings? Existing appointments will be kept.",
  "Reserva cancelada": "Booking canceled",
  "Reserva indisponível": "Booking unavailable",
  "Reserva reagendada com sucesso.": "Booking rescheduled successfully.",
  "Revise os horários: o fechamento precisa ser depois da abertura.": "Review the hours: closing time must be after opening time.",
  "Salvar alterações": "Save changes",
  "Salve primeiro as informações do negócio.": "Save the business details first.",
  "Se o e-mail estiver cadastrado, enviaremos um link de recuperação.": "If the email is registered, we will send a recovery link.",
  "Selecione pelo menos um dia de atendimento.": "Select at least one business day.",
  "Serviço removido.": "Service removed.",
  "Sincronização indisponível. O modo local continua funcionando.": "Sync unavailable. Local mode will keep working.",
  "Use a opção “Instalar aplicativo” do navegador, se disponível.": "Use the browser's “Install app” option, if available.",
  "Use uma senha com pelo menos 8 caracteres.": "Use a password with at least 8 characters.",
  "Você pode reagendar ou cancelar este horário usando este link privado.": "You can reschedule or cancel this appointment using this private link.",
  "Confirmar este agendamento?": "Confirm this booking?",
  "Marcar este atendimento como concluído?": "Mark this appointment as completed?",
  "Marcar que o cliente não compareceu?": "Mark the client as a no-show?",
  "Cancelar este horário?": "Cancel this appointment?",
  "Agendamento confirmado.": "Booking confirmed.",
  "Atendimento concluído.": "Appointment completed.",
  "Marcado como não compareceu.": "Marked as no-show.",
  "Agendamento cancelado.": "Booking canceled.",
  "Confirmar": "Confirm",
  "Concluir": "Complete",
  "Remover": "Remove",
  "Editar": "Edit",
  "Sem reservas neste filtro.": "No bookings match this filter.",
  "Agendar cliente": "Book client",
  "Ative “Aceitar reservas pelo link público” e salve para liberar o link.": "Enable “Accept bookings through the public link” and save to enable the link.",
  "Sua agenda está pronta para receber reservas pelo link público.": "Your schedule is ready to receive bookings through the public link."
};
  Object.assign(translations, {
  "Sincronizando…": "Syncing…",
  "Reserva online": "Online booking",
  "Conta criada e conectada.": "Account created and connected.",
  "Conta criada. Confirme o e-mail e depois entre.": "Account created. Confirm your email, then sign in.",
  "Notificações bloqueadas nas permissões do navegador.": "Notifications are blocked in your browser permissions.",
  "Ative o push para receber os lembretes selecionados.": "Enable push notifications to receive the selected reminders.",
  "Sua agenda ainda está vazia.": "Your schedule is still empty.",
  "Nenhum agendamento neste filtro.": "No bookings match this filter.",
  "Tente outro período ou status.": "Try another period or status.",
  "Crie um atendimento manualmente ou publique seu link para receber a primeira reserva.": "Create a booking manually or publish your link to receive your first booking.",
  "Adicione ao menos um serviço para receber reservas.": "Add at least one service to receive bookings.",
  "Confirmar": "Confirm",
  "Cancelar": "Cancel",
  "Concluir": "Complete",
  "Remover": "Remove",
  "Editar": "Edit",
  "Data": "Date",
  "Hora": "Time",
  "Cliente": "Client",
  "Telefone": "Phone",
  "Duração (min)": "Duration (min)",
  "Atendimento inicial": "Initial service",
  "Horários por dia": "Hours vary by day",
  "Nota 1": "Rating 1",
  "Nota 2": "Rating 2",
  "Nota 3": "Rating 3",
  "Nota 4": "Rating 4",
  "Nota 5": "Rating 5",
  "Sem atendimento:": "Closed:",
  "Agendamento confirmado.": "Booking confirmed.",
  "Atendimento concluído.": "Appointment completed.",
  "Marcado como não compareceu.": "Marked as no-show.",
  "Agendamento cancelado.": "Booking canceled.",
  "Informações salvas neste dispositivo.": "Details saved on this device.",
  "Configurações sincronizadas.": "Settings synced.",
  "Serviço removido.": "Service removed.",
  "Não foi possível enviar agora.": "Could not send right now.",
  "Obrigado! Feedback registrado.": "Thank you! Feedback submitted."
});
  Object.assign(translations, {
  "Notificação de teste enviada.": "Test notification sent.",
  "Teste concluído.": "Test completed.",
  "Notificações ativadas. Você receberá lembretes dos próximos atendimentos.": "Notifications enabled. You will receive reminders for upcoming appointments.",
  "1 avaliação": "1 rating",
  "1 agendamento neste filtro.": "1 booking in this filter.",
  "Reserva online": "Online booking",
  "Conta criada e conectada.": "Account created and connected.",
  "Conta criada. Confirme o e-mail e depois entre.": "Account created. Confirm your email, then sign in.",
  "Remover": "Remove",
  "Cancelar": "Cancel",
  "Concluir": "Complete"
});
  Object.assign(translations, {
  "DESEMPENHO": "PERFORMANCE",
  "Últimos 30 dias": "Last 30 days",
  "Baseado nos status da agenda": "Based on booking statuses",
  "Comparecimento": "Attendance",
  "concluídos ÷ concluídos + faltas": "completed ÷ completed + no-shows",
  "Não compareceram": "No-shows",
  "atendimentos marcados como falta": "appointments marked as no-show",
  "Cancelamentos": "Cancellations",
  "reservas canceladas no período": "bookings canceled in the period",
  "Receita estimada": "Estimated revenue",
  "somente atendimentos concluídos": "completed appointments only"
});
  Object.assign(translations, {
  "Adicionar ao calendário": "Add to calendar",
  "Baixe um arquivo .ics compatível com os principais calendários.": "Download an .ics file compatible with major calendar apps.",
  "Evento de calendário baixado.": "Calendar event downloaded."
});
  const reverse = Object.fromEntries(Object.entries(translations).map(([pt,en]) => [en,pt]));
  let activeLocale = localStorage.getItem(storageKey) === 'en' ? 'en' : 'pt-BR';
  let applying = false;
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function dynamicTranslate(value,target){
    if(target==='en'){
      let m=value.match(/^(\d+) de 3 etapas concluídas\. Complete o restante para publicar sua agenda\.$/);
      if(m) return `${m[1]} of 3 steps completed. Finish the remaining steps to publish your schedule.`;
      m=value.match(/^(\d+) agendamentos neste filtro\.$/);
      if(m) return `${m[1]} bookings in this filter.`;
      if(value==='1 agendamento neste filtro.') return '1 booking in this filter.';
      m=value.match(/^(\d+) avaliações$/);
      if(m) return `${m[1]} ratings`;
      m=value.match(/^Sem atendimento: (.+)$/);
      if(m) return `Closed: ${m[1]}`;
      m=value.match(/^Remover (.+)$/);
      if(m) return `Remove ${m[1]}`;
      m=value.match(/^Nuvem · (.+)$/);
      if(m) return `Cloud · ${m[1]}`;
      return value;
    }
    let m=value.match(/^(\d+) of 3 steps completed\. Finish the remaining steps to publish your schedule\.$/);
    if(m) return `${m[1]} de 3 etapas concluídas. Complete o restante para publicar sua agenda.`;
    m=value.match(/^(\d+) bookings in this filter\.$/);
    if(m) return `${m[1]} agendamentos neste filtro.`;
    if(value==='1 booking in this filter.') return '1 agendamento neste filtro.';
    m=value.match(/^(\d+) ratings$/);
    if(m) return `${m[1]} avaliações`;
    m=value.match(/^Closed: (.+)$/);
    if(m) return `Sem atendimento: ${m[1]}`;
    m=value.match(/^Remove (.+)$/);
    if(m) return `Remover ${m[1]}`;
    m=value.match(/^Cloud · (.+)$/);
    if(m) return `Nuvem · ${m[1]}`;
    return value;
  }

  function translateValue(value,target=activeLocale){
    if(typeof value!=='string') return value;
    const leading=value.match(/^\s*/)?.[0]||'';
    const trailing=value.match(/\s*$/)?.[0]||'';
    const core=value.trim();
    if(!core) return value;
    let translated=target==='en'?translations[core]:reverse[core];
    if(!translated) translated=dynamicTranslate(core,target);
    return translated===core?value:leading+translated+trailing;
  }

  function translateElement(root){
    if(!root||applying) return;
    applying=true;
    try{
      if(root.nodeType===Node.TEXT_NODE){
        const parent=root.parentElement;
        if(!parent||['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)) return;
        if(activeLocale==='pt-BR'&&originalText.has(root)){
          const original=originalText.get(root);
          if(root.nodeValue!==original) root.nodeValue=original;
        }else{
          const next=translateValue(root.nodeValue);
          if(next!==root.nodeValue){
            if(!originalText.has(root)) originalText.set(root,root.nodeValue);
            root.nodeValue=next;
          }
        }
        return;
      }
      if(root.nodeType!==Node.ELEMENT_NODE&&root!==document) return;
      const element=root===document?document.documentElement:root;
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        const parent=node.parentElement;
        if(!parent||['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)) continue;
        if(activeLocale==='pt-BR'&&originalText.has(node)){
          const original=originalText.get(node);
          if(node.nodeValue!==original) node.nodeValue=original;
        }else{
          const next=translateValue(node.nodeValue);
          if(next!==node.nodeValue){
            if(!originalText.has(node)) originalText.set(node,node.nodeValue);
            node.nodeValue=next;
          }
        }
      }
      const elements=[element,...(element.querySelectorAll?.('[placeholder],[aria-label],[title]')||[])];
      elements.forEach(el=>{
        ['placeholder','aria-label','title'].forEach(attr=>{
          if(!el?.hasAttribute?.(attr)) return;
          const before=el.getAttribute(attr);
          let saved=originalAttributes.get(el);
          if(!saved){saved={};originalAttributes.set(el,saved);}
          if(activeLocale==='pt-BR'&&saved[attr]!=null){
            if(el.getAttribute(attr)!==saved[attr]) el.setAttribute(attr,saved[attr]);
          }else{
            const after=translateValue(before);
            if(after!==before){
              if(saved[attr]==null) saved[attr]=before;
              el.setAttribute(attr,after);
            }
          }
        });
      });
    } finally { applying=false; }
  }

  function updateMeta(){
    const en=activeLocale==='en';
    document.documentElement.lang=en?'en':'pt-BR';
    document.title=en?'AgendaLeve — Simple scheduling for your business':'AgendaLeve — Agendamentos simples para seu negócio';
    const description=document.querySelector('meta[name="description"]');
    if(description) description.content=en
      ? 'Online scheduling for small businesses: set up services, receive bookings, and share a public link with clients.'
      : 'Agenda online para pequenos negócios: configure serviços, receba reservas e compartilhe um link público com seus clientes.';
    const ogTitle=document.querySelector('meta[property="og:title"]');
    if(ogTitle) ogTitle.content=document.title;
    const ogDescription=document.querySelector('meta[property="og:description"]');
    if(ogDescription) ogDescription.content=en
      ? 'Organize your schedule and receive bookings without exchanging endless messages.'
      : 'Organize horários e receba reservas sem trocar várias mensagens.';
  }

  function updateControls(){
    document.querySelectorAll('[data-language]').forEach(button=>{
      const selected=button.dataset.language===activeLocale;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }

  function setLocale(locale){
    activeLocale=locale==='en'?'en':'pt-BR';
    localStorage.setItem(storageKey,activeLocale);
    updateMeta();
    translateElement(document.body);
    updateControls();
    window.dispatchEvent(new CustomEvent('app-language-change',{detail:{locale:activeLocale}}));
  }

  function locale(){return activeLocale;}
  function t(value){return translateValue(value,activeLocale);}

  function init(){
    document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLocale(button.dataset.language)));
    setLocale(activeLocale);
    const observer=new MutationObserver(mutations=>{
      if(applying) return;
      mutations.forEach(mutation=>{
        if(mutation.type==='characterData') translateElement(mutation.target);
        mutation.addedNodes.forEach(node=>translateElement(node));
      });
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  window.AppI18n=Object.freeze({setLocale,locale,t,apply:translateElement});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();