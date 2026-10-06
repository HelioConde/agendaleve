const STORAGE = {
  config: 'agendaleve-config-v1',
  bookings: 'agendaleve-bookings'
};

const DEFAULT_CONFIG = {
  businessName: 'Meu negócio',
  opensAt: '08:00',
  closesAt: '19:00',
  slotStep: 30,
  days: [1, 2, 3, 4, 5],
  services: [{ id: 'service-initial', name: 'Atendimento inicial', duration: 60, price: 0 }],
  isPublic: false,
  slug: ''
};

const supabaseClient = window.AGENDALEVE_SUPABASE?.client || null;
const publicSlug = new URLSearchParams(location.search).get('negocio')?.trim().toLowerCase() || '';
const publicMode = Boolean(publicSlug);

const configForm = document.querySelector('#settings-form');
const serviceForm = document.querySelector('#service-form');
const bookingForm = document.querySelector('#booking-form');
const bookingService = document.querySelector('#booking-service');
const bookingDate = document.querySelector('#booking-date');
const bookingTime = document.querySelector('#booking-time');
const bookingList = document.querySelector('#booking-list');
const bookingDateFilter = document.querySelector('#booking-date-filter');
const bookingStatusFilter = document.querySelector('#booking-status-filter');
const serviceList = document.querySelector('#service-list');
const accountDialog = document.querySelector('#account-dialog');
const accountOpenButton = document.querySelector('#account-open');
const accountCloseButton = document.querySelector('#account-close');
const accountForm = document.querySelector('#auth-form');
const accountProfile = document.querySelector('#account-profile');
const accountMessage = document.querySelector('#account-message');
const syncStatus = document.querySelector('#sync-status');

let currentUser = null;
let currentBusiness = null;
let activeConfig = readLocalConfig();
let activeBookings = readLocalBookings();
let availableSlotMap = new Map();
let cloudLoading = false;

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readLocalConfig() {
  const stored = readJson(STORAGE.config, {});
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    days: Array.isArray(stored.days) ? stored.days : DEFAULT_CONFIG.days,
    services: Array.isArray(stored.services) ? stored.services : DEFAULT_CONFIG.services
  };
}

function writeLocalConfig(config) {
  localStorage.setItem(STORAGE.config, JSON.stringify(config));
}

function readLocalBookings() {
  const stored = readJson(STORAGE.bookings, []);
  if (!Array.isArray(stored)) return [];
  return stored.map((booking, index) => ({
    id: booking.id || `legacy-${index}`,
    client: booking.client || '',
    phone: booking.phone || '',
    service: booking.service || 'Atendimento',
    serviceId: booking.serviceId || '',
    date: booking.date,
    time: booking.time,
    duration: Number(booking.duration) || 60,
    price: Number(booking.price) || 0,
    status: booking.status || 'confirmed'
  }));
}

function writeLocalBookings(bookings) {
  localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
  activeBookings = bookings;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('on');
  window.setTimeout(() => toast.classList.remove('on'), 2200);
}

function minutesOf(time) {
  const [hours, minutes] = String(time).slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function timeOf(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const rest = String(minutes % 60).padStart(2, '0');
  return `${hours}:${rest}`;
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return '';
  return digits.startsWith('55') ? '+' + digits : '+55' + digits;
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value || '';
}

function localDateString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function slugify(value) {
  return String(value || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'agenda';
}

function currentConfig() {
  return activeConfig || DEFAULT_CONFIG;
}

function currentBookings() {
  return activeBookings || [];
}

function serviceById(id) {
  return currentConfig().services.find(service => service.id === id);
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short'
  });
}

function inBusinessZone(iso, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(iso));
  const map = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`
  };
}

function switchView(name) {
  if (publicMode && name !== 'reservas') name = 'reservas';
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(view => {
    view.hidden = view.id !== `view-${name}`;
  });
  if (name === 'reservas') refreshAvailability();
  if (name === 'configuracao') fillSettings();
}

function bookingStatusLabel(status) {
  return ({
    pending: 'Pendente',
    confirmed: 'Confirmada',
    completed: 'Concluída',
    cancelled: 'Cancelada'
  })[status] || 'Reserva';
}

function renderDashboard() {
  const config = currentConfig();
  const now = new Date();
  const today = localDateString(now);
  const allBookings = [...currentBookings()];
  const upcomingActive = allBookings.filter(booking => {
    const active = booking.status === 'pending' || booking.status === 'confirmed';
    return active && new Date(`${booking.date}T${booking.time}:00`) >= now;
  });

  const period = bookingDateFilter?.value || 'upcoming';
  const status = bookingStatusFilter?.value || 'active';
  let bookings = allBookings.filter(booking => {
    const starts = new Date(`${booking.date}T${booking.time}:00`);
    const matchesPeriod = period === 'all'
      || (period === 'today' && booking.date === today)
      || (period === 'upcoming' && starts >= now)
      || (period === 'past' && starts < now);
    const matchesStatus = status === 'all'
      || (status === 'active' && (booking.status === 'pending' || booking.status === 'confirmed'))
      || booking.status === status;
    return matchesPeriod && matchesStatus;
  });

  bookings.sort((a, b) => {
    const comparison = `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
    return period === 'past' ? -comparison : comparison;
  });

  document.querySelector('#business-name-card').textContent = config.businessName;
  document.querySelector('#stat-upcoming').textContent = String(upcomingActive.length);
  document.querySelector('#stat-services').textContent = String(config.services.length);
  document.querySelector('#stat-hours').textContent = config.days.length ? `${config.opensAt}–${config.closesAt}` : '—';
  const filterCount = document.querySelector('#booking-filter-count');
  if (filterCount) filterCount.textContent = bookings.length === 1 ? '1 agendamento neste filtro.' : `${bookings.length} agendamentos neste filtro.`;

  bookingList.innerHTML = bookings.length
    ? bookings.map(booking => {
      const actions = booking.status === 'pending'
        ? `<button class="text-button" type="button" data-booking-action="confirm" data-booking-id="${escapeHtml(booking.id)}">Confirmar</button><button class="text-button danger" type="button" data-booking-action="cancel" data-booking-id="${escapeHtml(booking.id)}">Cancelar</button>`
        : booking.status === 'confirmed'
          ? `<button class="text-button" type="button" data-booking-action="complete" data-booking-id="${escapeHtml(booking.id)}">Concluir</button><button class="text-button danger" type="button" data-booking-action="cancel" data-booking-id="${escapeHtml(booking.id)}">Cancelar</button>`
          : '';
      return `
      <article class="booking-row">
        <div class="booking-date"><strong>${formatDate(booking.date)}</strong><span>${escapeHtml(booking.time)}</span></div>
        <div class="booking-info">
          <div class="booking-title-line"><strong>${escapeHtml(booking.client)}</strong><span class="status-chip status-${escapeHtml(booking.status)}">${bookingStatusLabel(booking.status)}</span></div>
          <span>${escapeHtml(booking.service)} · ${booking.duration} min</span>
          ${booking.phone ? `<a class="booking-contact" href="https://wa.me/${booking.phone.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp ${escapeHtml(formatPhone(booking.phone))}</a>` : ''}
        </div>
        <div class="booking-actions">${actions}</div>
      </article>`;
    }).join('')
    : '<div class="empty"><strong>Nenhum agendamento encontrado.</strong><span>Altere os filtros para consultar outros horários.</span></div>';
}

function fillSettings() {
  const config = currentConfig();
  configForm.elements.businessName.value = config.businessName;
  configForm.elements.opensAt.value = config.opensAt;
  configForm.elements.closesAt.value = config.closesAt;
  configForm.elements.slotStep.value = String(config.slotStep);
  configForm.querySelectorAll('[name="days"]').forEach(input => {
    input.checked = config.days.includes(Number(input.value));
  });
  document.querySelector('#settings-public').checked = Boolean(config.isPublic);
  renderServices();
  updateCloudUi();
}

function renderServices() {
  const config = currentConfig();
  serviceList.innerHTML = config.services.length
    ? config.services.map(service => `
      <article class="service-row">
        <div><strong>${escapeHtml(service.name)}</strong><span>${service.duration} min · ${Number(service.price).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
        <button class="text-button danger" type="button" data-remove-service="${escapeHtml(service.id)}" aria-label="Remover ${escapeHtml(service.name)}">Remover</button>
      </article>`).join('')
    : '<div class="empty">Adicione ao menos um serviço para receber reservas.</div>';
}

function renderServiceOptions() {
  const config = currentConfig();
  const previous = bookingService.value;
  bookingService.innerHTML = config.services.length
    ? config.services.map(service => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)} · ${service.duration} min · ${Number(service.price).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</option>`).join('')
    : '<option value="">Nenhum serviço cadastrado</option>';
  if (config.services.some(service => service.id === previous)) bookingService.value = previous;
  const enabled = config.services.length > 0;
  bookingService.disabled = !enabled;
  bookingForm.querySelector('[type="submit"]').disabled = !enabled;

  document.querySelector('#booking-business-name').textContent = config.businessName;
  document.querySelector('#booking-hours').textContent = config.days.length ? `${config.opensAt}–${config.closesAt}` : '—';
}

function availableTimesLocal(date, service) {
  const config = currentConfig();
  if (!service || !date) return [];
  const selectedDate = new Date(`${date}T00:00:00`);
  if (!config.days.includes(selectedDate.getDay())) return [];

  const open = minutesOf(config.opensAt);
  const close = minutesOf(config.closesAt);
  const duration = Number(service.duration);
  const today = new Date();
  const isToday = date === localDateString(today);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const bookings = currentBookings().filter(booking => booking.date === date && booking.status !== 'cancelled');
  const times = [];

  for (let start = open; start + duration <= close; start += Number(config.slotStep)) {
    if (isToday && start <= nowMinutes) continue;
    const end = start + duration;
    const overlaps = bookings.some(booking => {
      const bookedStart = minutesOf(booking.time);
      const bookedEnd = bookedStart + Number(booking.duration || 30);
      return start < bookedEnd && bookedStart < end;
    });
    if (!overlaps) times.push(timeOf(start));
  }
  return times;
}

async function fetchCloudAvailability(date, service) {
  if (!supabaseClient || !currentBusiness?.slug || !service?.id || !date) return [];
  const { data, error } = await supabaseClient.functions.invoke('booking-availability', {
    body: { businessSlug: currentBusiness.slug, serviceId: service.id, date }
  });
  if (error) throw error;
  availableSlotMap = new Map((data?.slots || []).map(slot => [slot.time, slot.startsAt]));
  return (data?.slots || []).map(slot => slot.time);
}

async function refreshAvailability() {
  const config = currentConfig();
  const service = serviceById(bookingService.value || config.services[0]?.id);
  const date = bookingDate.value;
  const dayName = date ? new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {weekday:'long'}) : '';
  const openDay = date && config.days.includes(new Date(`${date}T00:00:00`).getDay());

  let times = [];
  bookingTime.disabled = true;
  bookingForm.querySelector('[type="submit"]').disabled = true;
  bookingTime.innerHTML = '<option value="">Consultando horários…</option>';

  try {
    if (date && service && currentBusiness?.is_public && supabaseClient) {
      times = await fetchCloudAvailability(date, service);
    } else {
      availableSlotMap = new Map();
      times = availableTimesLocal(date, service);
    }
  } catch {
    bookingTime.innerHTML = '<option value="">Não foi possível consultar agora</option>';
    return;
  }

  bookingTime.innerHTML = times.length
    ? times.map(time => `<option value="${time}">${time}</option>`).join('')
    : '<option value="">Nenhum horário disponível</option>';
  bookingTime.disabled = times.length === 0;
  bookingForm.querySelector('[type="submit"]').disabled = times.length === 0;

  if (!date) bookingTime.firstElementChild.textContent = 'Escolha uma data';
  else if (!openDay) bookingTime.firstElementChild.textContent = `Sem atendimento: ${dayName}`;
  else if (!service) bookingTime.firstElementChild.textContent = 'Cadastre um serviço';
}

function showBookingConfirmation(booking) {
  const dateLabel = new Date(`${booking.date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  const summary = `${booking.service} · ${dateLabel}, às ${booking.time} · ${booking.client}`;
  const message = `Olá, ${booking.client}! Sua reserva de ${booking.service} está confirmada para ${dateLabel}, às ${booking.time}. Até lá!`;
  document.querySelector('#confirmationSummary').textContent = summary;
  document.querySelector('#confirmationMessage').textContent = message;
  document.querySelector('#whatsappConfirmation').href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  document.querySelector('#bookingFormLayout').hidden = true;
  document.querySelector('#bookingConfirmation').hidden = false;
  document.querySelector('#bookingConfirmation h2').focus();
}

function cloudConfigFromRows(business, hours, services) {
  const firstHours = hours[0];
  return {
    businessName: business.name,
    opensAt: firstHours?.opens_at?.slice(0, 5) || '08:00',
    closesAt: firstHours?.closes_at?.slice(0, 5) || '19:00',
    slotStep: Number(business.slot_interval_minutes) || 30,
    days: hours.map(row => Number(row.weekday)).sort((a, b) => a - b),
    services: services.filter(row => row.is_active !== false).map(row => ({
      id: row.id,
      name: row.name,
      duration: Number(row.duration_minutes),
      price: Number(row.price_cents) / 100
    })),
    isPublic: Boolean(business.is_public),
    slug: business.slug
  };
}

function cloudBookingsFromRows(rows, timeZone) {
  return rows.map(row => {
    const start = inBusinessZone(row.starts_at, timeZone);
    const endMs = Date.parse(row.ends_at);
    const startMs = Date.parse(row.starts_at);
    return {
      id: row.id,
      client: row.client_name,
      phone: row.client_phone || '',
      service: row.service_name,
      serviceId: row.service_id,
      date: start.date,
      time: start.time,
      duration: Math.round((endMs - startMs) / 60000),
      price: Number(row.price_cents) / 100,
      status: row.status
    };
  });
}

async function loadOwnerCloud() {
  if (!supabaseClient || !currentUser) return;
  cloudLoading = true;
  updateAccountUi();

  const { data: business, error } = await supabaseClient
    .from('agendaleve_businesses')
    .select('*')
    .eq('owner_id', currentUser.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    showAccountMessage('Não foi possível carregar sua agenda.');
    cloudLoading = false;
    updateAccountUi();
    return;
  }

  if (!business) {
    currentBusiness = null;
    activeConfig = { ...readLocalConfig(), services: readLocalConfig().services.filter(s => s.id !== 'service-initial') };
    activeBookings = [];
    cloudLoading = false;
    renderAll();
    updateAccountUi();
    return;
  }

  currentBusiness = business;
  const [hoursResult, servicesResult, bookingsResult] = await Promise.all([
    supabaseClient.from('agendaleve_business_hours').select('*').eq('business_id', business.id).order('weekday'),
    supabaseClient.from('agendaleve_services').select('*').eq('business_id', business.id).eq('is_active', true).order('created_at'),
    supabaseClient.from('agendaleve_bookings').select('*').eq('business_id', business.id).order('starts_at')
  ]);

  if (hoursResult.error || servicesResult.error || bookingsResult.error) {
    showAccountMessage('Parte da agenda não pôde ser carregada.');
  }

  activeConfig = cloudConfigFromRows(business, hoursResult.data || [], servicesResult.data || []);
  activeBookings = cloudBookingsFromRows(bookingsResult.data || [], business.timezone);
  cloudLoading = false;
  renderAll();
  updateAccountUi();
}

async function loadPublicBusiness() {
  if (!supabaseClient || !publicSlug) return;
  const { data: business, error } = await supabaseClient
    .from('agendaleve_businesses')
    .select('*')
    .eq('slug', publicSlug)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !business) {
    document.querySelector('#booking-business-name').textContent = 'Agenda indisponível';
    document.querySelector('#booking-mode-note').textContent = 'Este link de reservas não está disponível.';
    bookingForm.hidden = true;
    return;
  }

  currentBusiness = business;
  const [hoursResult, servicesResult] = await Promise.all([
    supabaseClient.from('agendaleve_business_hours').select('*').eq('business_id', business.id).order('weekday'),
    supabaseClient.from('agendaleve_services').select('*').eq('business_id', business.id).eq('is_active', true).order('created_at')
  ]);

  activeConfig = cloudConfigFromRows(business, hoursResult.data || [], servicesResult.data || []);
  activeBookings = [];
  document.querySelector('#public-mode-name').textContent = business.name;
  document.querySelector('#business-name-card').textContent = business.name;
  document.querySelector('#booking-mode-note').textContent = 'Os horários são consultados em tempo real e a reserva é validada no servidor.';
  renderServiceOptions();
  switchView('reservas');
}

async function saveCloudSettings(values, days) {
  if (!currentUser || !supabaseClient) throw new Error('Entre na conta primeiro.');
  const name = values.businessName.trim();
  const payload = {
    owner_id: currentUser.id,
    name,
    slot_interval_minutes: Number(values.slotStep),
    is_public: Boolean(configForm.elements.isPublic.checked),
    timezone: currentBusiness?.timezone || 'America/Sao_Paulo',
    updated_at: new Date().toISOString()
  };

  let business = currentBusiness;
  if (!business) {
    payload.slug = `${slugify(name)}-${currentUser.id.slice(0, 6)}`;
    const { data, error } = await supabaseClient.from('agendaleve_businesses').insert(payload).select('*').single();
    if (error) throw error;
    business = data;
    currentBusiness = data;
  } else {
    const { data, error } = await supabaseClient
      .from('agendaleve_businesses')
      .update(payload)
      .eq('id', business.id)
      .select('*')
      .single();
    if (error) throw error;
    business = data;
    currentBusiness = data;
  }

  const { error: deleteHoursError } = await supabaseClient
    .from('agendaleve_business_hours')
    .delete()
    .eq('business_id', business.id);
  if (deleteHoursError) throw deleteHoursError;

  if (days.length) {
    const rows = days.map(weekday => ({
      business_id: business.id,
      weekday,
      opens_at: values.opensAt,
      closes_at: values.closesAt
    }));
    const { error: hoursError } = await supabaseClient.from('agendaleve_business_hours').insert(rows);
    if (hoursError) throw hoursError;
  }

  await loadOwnerCloud();
}

function updateAccountUi() {
  accountOpenButton.disabled = !supabaseClient;
  accountOpenButton.textContent = currentUser ? 'Minha conta' : 'Entrar / sincronizar';
  syncStatus.innerHTML = currentUser
    ? `<span class="demo-dot"></span> ${cloudLoading ? 'Sincronizando…' : 'Nuvem · ' + escapeHtml(currentUser.email || 'conectado')}`
    : '<span class="demo-dot"></span> Modo local';

  accountForm.hidden = !supabaseClient || Boolean(currentUser);
  accountProfile.hidden = !currentUser;
  if (currentUser) document.querySelector('#account-email').textContent = currentUser.email || 'Conta conectada';

  updateCloudUi();
}

function updateCloudUi() {
  const callout = document.querySelector('#cloud-callout');
  const linkCard = document.querySelector('#public-link-card');
  callout.hidden = Boolean(currentUser);
  linkCard.hidden = !(currentUser && currentBusiness);
  if (currentUser && currentBusiness) {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('negocio', currentBusiness.slug);
    document.querySelector('#public-link-text').textContent = currentBusiness.is_public
      ? url.toString()
      : 'Ative “Aceitar reservas pelo link público” e salve para liberar o link.';
  }
}

function showAccountMessage(message) {
  accountMessage.textContent = message;
}

function authErrorText(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (message.includes('already registered')) return 'Este e-mail já possui conta.';
  if (message.includes('password should be at least')) return 'Use uma senha com pelo menos 8 caracteres.';
  return 'Não foi possível concluir. Confira os dados e tente novamente.';
}

function renderAll() {
  fillSettings();
  renderServices();
  renderServiceOptions();
  renderDashboard();
  refreshAvailability();
}

function initAccount() {
  document.querySelector('#cloud-callout-login').addEventListener('click', () => accountDialog.showModal());
  accountOpenButton.addEventListener('click', () => accountDialog.showModal());
  accountCloseButton.addEventListener('click', () => accountDialog.close());
  accountDialog.addEventListener('click', event => {
    if (event.target === accountDialog) accountDialog.close();
  });

  accountForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) return;
    const button = accountForm.querySelector('[type="submit"]');
    button.disabled = true;
    showAccountMessage('Entrando…');
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: accountForm.elements.email.value.trim(),
        password: accountForm.elements.password.value
      });
      if (error) throw error;
      showAccountMessage('Conta conectada.');
    } catch (error) {
      showAccountMessage(authErrorText(error));
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#sign-up').addEventListener('click', async () => {
    if (!supabaseClient) return;
    const email = accountForm.elements.email.value.trim();
    const password = accountForm.elements.password.value;
    if (!email || password.length < 8) {
      showAccountMessage('Informe um e-mail e uma senha com pelo menos 8 caracteres.');
      return;
    }
    const button = document.querySelector('#sign-up');
    button.disabled = true;
    showAccountMessage('Criando conta…');
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      showAccountMessage(data.session ? 'Conta criada e conectada.' : 'Conta criada. Confirme o e-mail e depois entre.');
    } catch (error) {
      showAccountMessage(authErrorText(error));
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#reset-password').addEventListener('click', async () => {
    if (!supabaseClient) return;
    const email = accountForm.elements.email.value.trim();
    if (!email) {
      showAccountMessage('Informe seu e-mail primeiro.');
      return;
    }
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href.split('?')[0].split('#')[0]
      });
      if (error) throw error;
      showAccountMessage('Se o e-mail estiver cadastrado, enviaremos um link de recuperação.');
    } catch (error) {
      showAccountMessage(authErrorText(error));
    }
  });

  document.querySelector('#sign-out').addEventListener('click', async () => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    showAccountMessage(error ? 'Não foi possível sair.' : 'Você saiu da conta.');
  });

  if (!supabaseClient) {
    showAccountMessage('Sincronização indisponível. O modo local continua funcionando.');
    updateAccountUi();
    return;
  }

  let activeUserId = null;
  const setSession = session => {
    const user = session?.user || null;
    if (user?.id === activeUserId) return;
    activeUserId = user?.id || null;
    currentUser = user;
    currentBusiness = null;

    if (user) {
      window.setTimeout(loadOwnerCloud, 0);
    } else {
      activeConfig = readLocalConfig();
      activeBookings = readLocalBookings();
      renderAll();
    }
    updateAccountUi();
  };

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => setSession(session), 0);
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) showAccountMessage('Não foi possível verificar a sessão.');
    else setSession(data.session);
  });
}

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});
document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.go));
});

configForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!configForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(configForm));
  const days = Array.from(configForm.querySelectorAll('[name="days"]:checked')).map(input => Number(input.value));
  if (!days.length) {
    showToast('Selecione pelo menos um dia de atendimento.');
    return;
  }
  if (minutesOf(values.closesAt) <= minutesOf(values.opensAt)) {
    showToast('O horário de fechamento precisa ser depois da abertura.');
    return;
  }

  if (currentUser) {
    const button = configForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await saveCloudSettings(values, days);
      showToast('Configurações sincronizadas.');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível salvar na nuvem.');
    } finally {
      button.disabled = false;
    }
    return;
  }

  const current = readLocalConfig();
  activeConfig = {
    ...current,
    businessName: values.businessName.trim(),
    opensAt: values.opensAt,
    closesAt: values.closesAt,
    slotStep: Number(values.slotStep),
    days,
    isPublic: false
  };
  writeLocalConfig(activeConfig);
  renderAll();
  showToast('Informações salvas neste dispositivo.');
});

serviceForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!serviceForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(serviceForm));
  const service = {
    name: values.serviceName.trim(),
    duration: Number(values.duration),
    price: Number(values.price) || 0
  };

  if (currentUser) {
    if (!currentBusiness) {
      showToast('Salve primeiro as informações do negócio.');
      return;
    }
    const { data, error } = await supabaseClient.from('agendaleve_services').insert({
      business_id: currentBusiness.id,
      name: service.name,
      duration_minutes: service.duration,
      price_cents: Math.round(service.price * 100),
      is_active: true
    }).select('*').single();

    if (error) {
      showToast('Não foi possível adicionar o serviço.');
      return;
    }
    activeConfig.services.push({
      id: data.id,
      name: data.name,
      duration: Number(data.duration_minutes),
      price: Number(data.price_cents) / 100
    });
  } else {
    const current = readLocalConfig();
    current.services.push({
      id: crypto.randomUUID?.() || `service-${Date.now()}`,
      ...service
    });
    activeConfig = current;
    writeLocalConfig(current);
  }

  serviceForm.reset();
  serviceForm.elements.duration.value = '30';
  renderAll();
  showToast('Serviço adicionado.');
});

serviceList.addEventListener('click', async event => {
  const button = event.target.closest('[data-remove-service]');
  if (!button) return;
  if (!window.confirm('Remover este serviço das próximas reservas? Os atendimentos já marcados serão mantidos.')) return;
  const id = button.dataset.removeService;

  if (currentUser) {
    const { error } = await supabaseClient.from('agendaleve_services').update({ is_active: false }).eq('id', id);
    if (error) {
      showToast('Não foi possível remover o serviço.');
      return;
    }
    activeConfig.services = activeConfig.services.filter(service => service.id !== id);
  } else {
    const config = readLocalConfig();
    config.services = config.services.filter(service => service.id !== id);
    activeConfig = config;
    writeLocalConfig(config);
  }

  renderAll();
  showToast('Serviço removido.');
});

bookingService.addEventListener('change', refreshAvailability);
bookingDate.addEventListener('change', refreshAvailability);

bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!bookingForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(bookingForm));
  const phone = normalizePhone(values.phone);
  if (!phone) {
    showToast('Informe um WhatsApp ou telefone válido com DDD.');
    bookingForm.elements.phone.focus();
    return;
  }
  const service = serviceById(values.serviceId);
  if (!service) {
    showToast('Escolha um serviço disponível.');
    return;
  }

  const available = bookingTime.value;
  if (!available) {
    showToast('Escolha um horário disponível.');
    return;
  }

  const button = bookingForm.querySelector('[type="submit"]');
  button.disabled = true;

  try {
    let booking;

    if (currentBusiness?.is_public && supabaseClient) {
      const startsAt = availableSlotMap.get(values.time);
      if (!startsAt) {
        await refreshAvailability();
        throw new Error('slot_changed');
      }
      const { data, error } = await supabaseClient.functions.invoke('create-booking', {
        body: {
          businessSlug: currentBusiness.slug,
          serviceId: service.id,
          startsAt,
          clientName: values.client.trim(),
          clientPhone: phone
        }
      });
      if (error) throw error;
      booking = {
        id: data?.bookingId || crypto.randomUUID?.() || String(Date.now()),
        client: values.client.trim(),
        phone,
        serviceId: service.id,
        service: service.name,
        duration: Number(service.duration),
        price: Number(service.price),
        date: values.date,
        time: values.time,
        status: 'confirmed'
      };
      if (currentUser && !publicMode) activeBookings.push(booking);
    } else if (currentUser && currentBusiness) {
      const startDate = new Date(`${values.date}T${values.time}:00`);
      const endDate = new Date(startDate.getTime() + Number(service.duration) * 60000);
      const { data, error } = await supabaseClient.from('agendaleve_bookings').insert({
        business_id: currentBusiness.id,
        service_id: service.id,
        client_name: values.client.trim(),
        client_phone: phone,
        service_name: service.name,
        price_cents: Math.round(Number(service.price) * 100),
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        status: 'confirmed'
      }).select('*').single();
      if (error) throw error;
      booking = cloudBookingsFromRows([data], currentBusiness.timezone)[0];
      activeBookings.push(booking);
    } else {
      const times = availableTimesLocal(values.date, service);
      if (!times.includes(values.time)) throw new Error('slot_changed');
      booking = {
        id: crypto.randomUUID?.() || `booking-${Date.now()}`,
        client: values.client.trim(),
        phone,
        serviceId: service.id,
        service: service.name,
        duration: Number(service.duration),
        price: Number(service.price),
        date: values.date,
        time: values.time,
        status: 'confirmed'
      };
      const bookings = readLocalBookings();
      bookings.push(booking);
      writeLocalBookings(bookings);
    }

    showBookingConfirmation(booking);
    bookingForm.reset();
    bookingDate.min = localDateString(new Date());
    bookingDate.value = '';
    renderServiceOptions();
    renderDashboard();
    await refreshAvailability();
  } catch (error) {
    console.error(error);
    await refreshAvailability();
    showToast('Esse horário pode ter acabado de ser reservado. Escolha outro.');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#copyConfirmation').addEventListener('click', async () => {
  const message = document.querySelector('#confirmationMessage').textContent;
  try {
    await navigator.clipboard.writeText(message);
    showToast('Mensagem de confirmação copiada.');
  } catch {
    showToast('Não foi possível copiar. Selecione e copie a mensagem.');
  }
});

document.querySelector('#newBooking').addEventListener('click', () => {
  bookingForm.reset();
  bookingDate.min = localDateString(new Date());
  bookingDate.value = '';
  renderServiceOptions();
  refreshAvailability();
  document.querySelector('#bookingConfirmation').hidden = true;
  document.querySelector('#bookingFormLayout').hidden = false;
});

bookingDateFilter?.addEventListener('change', renderDashboard);
bookingStatusFilter?.addEventListener('change', renderDashboard);

bookingList.addEventListener('click', async event => {
  const button = event.target.closest('[data-booking-action]');
  if (!button) return;
  const action = button.dataset.bookingAction;
  const id = button.dataset.bookingId;
  const nextStatus = action === 'confirm' ? 'confirmed'
    : action === 'complete' ? 'completed'
    : action === 'cancel' ? 'cancelled'
    : '';
  if (!nextStatus || !id) return;

  const prompts = {
    confirmed: 'Confirmar este agendamento?',
    completed: 'Marcar este atendimento como concluído?',
    cancelled: 'Cancelar este horário?'
  };
  if (!window.confirm(prompts[nextStatus])) return;

  button.disabled = true;
  if (currentUser) {
    const { error } = await supabaseClient.from('agendaleve_bookings').update({ status: nextStatus }).eq('id', id);
    if (error) {
      button.disabled = false;
      showToast('Não foi possível atualizar o agendamento.');
      return;
    }
    activeBookings = activeBookings.map(item => item.id === id ? { ...item, status: nextStatus } : item);
  } else {
    const bookings = readLocalBookings().map(item => item.id === id ? { ...item, status: nextStatus } : item);
    writeLocalBookings(bookings);
  }

  renderDashboard();
  refreshAvailability();
  const messages = {
    confirmed: 'Agendamento confirmado.',
    completed: 'Atendimento concluído.',
    cancelled: 'Agendamento cancelado.'
  };
  showToast(messages[nextStatus]);
});

document.querySelector('#copy-public-link').addEventListener('click', async () => {
  if (!currentBusiness?.is_public) {
    showToast('Ative o link público e salve primeiro.');
    return;
  }
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('negocio', currentBusiness.slug);
  try {
    await navigator.clipboard.writeText(url.toString());
    showToast('Link público copiado.');
  } catch {
    showToast('Não foi possível copiar o link.');
  }
});

function initializeLocal() {
  if (!localStorage.getItem(STORAGE.config)) writeLocalConfig(DEFAULT_CONFIG);
  activeConfig = readLocalConfig();
  activeBookings = readLocalBookings();
  bookingDate.min = localDateString(new Date());
  renderAll();
}

async function initialize() {
  bookingDate.min = localDateString(new Date());

  if (publicMode) {
    document.querySelector('#account-open').hidden = true;
    document.querySelector('#sync-status').innerHTML = '<span class="demo-dot"></span> Reserva online';
    document.querySelector('#main-tabs').hidden = true;
    document.querySelector('#view-agenda').hidden = true;
    document.querySelector('#view-configuracao').hidden = true;
    document.querySelector('#plans-section').hidden = true;
    document.querySelector('#public-mode-banner').hidden = false;
    document.querySelector('#view-reservas').hidden = false;
    if (supabaseClient) await loadPublicBusiness();
    else {
      document.querySelector('#booking-business-name').textContent = 'Agenda indisponível';
      bookingForm.hidden = true;
    }
    return;
  }

  initializeLocal();
  initAccount();
}

initialize();
