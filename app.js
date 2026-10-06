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
  hoursByDay: {
    1: { opensAt: '08:00', closesAt: '19:00' },
    2: { opensAt: '08:00', closesAt: '19:00' },
    3: { opensAt: '08:00', closesAt: '19:00' },
    4: { opensAt: '08:00', closesAt: '19:00' },
    5: { opensAt: '08:00', closesAt: '19:00' }
  },
  services: [{ id: 'service-initial', name: 'Atendimento inicial', duration: 60, price: 0 }],
  isPublic: false,
  slug: ''
};

const supabaseClient = window.AGENDALEVE_SUPABASE?.client || null;
const queryParams = new URLSearchParams(location.search);
const publicSlug = queryParams.get('negocio')?.trim().toLowerCase() || '';
const cancelBookingId = queryParams.get('booking')?.trim() || '';
const cancelToken = queryParams.get('cancel')?.trim() || '';
const customerCancelMode = Boolean(cancelBookingId && cancelToken);
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
const bookingSearch = document.querySelector('#booking-search');
const exportBookingsButton = document.querySelector('#export-bookings');
const serviceList = document.querySelector('#service-list');
const accountDialog = document.querySelector('#account-dialog');
const accountOpenButton = document.querySelector('#account-open');
const accountCloseButton = document.querySelector('#account-close');
const accountForm = document.querySelector('#auth-form');
const accountProfile = document.querySelector('#account-profile');
const accountMessage = document.querySelector('#account-message');
const syncStatus = document.querySelector('#sync-status');
const introSection = document.querySelector('#intro-section');
const plansSection = document.querySelector('#plans-section');
const bookingSummaryService = document.querySelector('#booking-summary-service');
const bookingSummaryDuration = document.querySelector('#booking-summary-duration');
const bookingSummaryPrice = document.querySelector('#booking-summary-price');
const bookingSummaryDate = document.querySelector('#booking-summary-date');
const bookingSummaryTime = document.querySelector('#booking-summary-time');
const bookingSummaryHelp = document.querySelector('#booking-summary-help');
const pushToggleButton = document.querySelector('#push-toggle');
const pushStatus = document.querySelector('#push-status');
const saveRemindersButton = document.querySelector('#save-reminders');
const reminder24h = document.querySelector('#reminder-24h');
const reminder2h = document.querySelector('#reminder-2h');
const clientFeedbackForm = document.querySelector('#client-feedback-form');
const ownerFeedbackForm = document.querySelector('#owner-feedback-form');
const turnstileContainer = document.querySelector('#turnstile-container');

let currentUser = null;
let currentBusiness = null;
let activeConfig = readLocalConfig();
let activeBookings = readLocalBookings();
let availableSlotMap = new Map();
let managedBooking = null;
let editingServiceId = null;
let cloudLoading = false;
let turnstileToken = '';
let turnstileWidgetId = null;
let turnstileScriptPromise = null;
let bookingStartedTracked = false;

const betaSessionId = (() => {
  const key = 'agendaleve-beta-session';
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = (crypto.randomUUID?.() || String(Date.now())) + '-' + Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, value);
  }
  return value;
})();

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeHoursByDay(config) {
  const days = Array.isArray(config.days) ? config.days.map(Number) : DEFAULT_CONFIG.days;
  if (config.hoursByDay && typeof config.hoursByDay === 'object') {
    return Object.fromEntries(days.map(day => {
      const row = config.hoursByDay[day] || config.hoursByDay[String(day)] || {};
      return [day, {
        opensAt: String(row.opensAt || config.opensAt || '08:00').slice(0, 5),
        closesAt: String(row.closesAt || config.closesAt || '19:00').slice(0, 5)
      }];
    }));
  }
  return Object.fromEntries(days.map(day => [day, {
    opensAt: config.opensAt || '08:00',
    closesAt: config.closesAt || '19:00'
  }]));
}

function readLocalConfig() {
  const stored = readJson(STORAGE.config, {});
  const merged = {
    ...DEFAULT_CONFIG,
    ...stored,
    days: Array.isArray(stored.days) ? stored.days.map(Number) : DEFAULT_CONFIG.days,
    services: Array.isArray(stored.services) ? stored.services : DEFAULT_CONFIG.services
  };
  merged.hoursByDay = normalizeHoursByDay(merged);
  return merged;
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

function betaRole() {
  return currentUser && !publicMode ? 'owner' : 'client';
}

async function sendBetaSignal(payload) {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient.functions.invoke('beta-signal', {
      body: {
        sessionId: betaSessionId,
        businessSlug: currentBusiness?.slug || publicSlug || '',
        role: payload.role || betaRole(),
        ...payload
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.debug('AgendaLeve beta signal skipped:', error?.message || error);
    return null;
  }
}

function trackBetaEvent(eventName, context = {}, role = betaRole()) {
  return sendBetaSignal({ kind: 'event', eventName, context, role });
}

function turnstileIsConfigured() {
  return Boolean(window.AGENDALEVE_SUPABASE?.turnstileSiteKey);
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('turnstile_load_failed'));
    document.head.append(script);
  });
  return turnstileScriptPromise;
}

async function ensureTurnstileWidget() {
  if (!turnstileContainer || !turnstileIsConfigured() || customerCancelMode) return;
  turnstileContainer.hidden = false;
  if (turnstileWidgetId !== null) return;
  try {
    const turnstile = await loadTurnstileScript();
    if (!turnstile?.render) throw new Error('turnstile_unavailable');
    turnstileWidgetId = turnstile.render(turnstileContainer, {
      sitekey: window.AGENDALEVE_SUPABASE.turnstileSiteKey,
      theme: 'light',
      size: 'flexible',
      appearance: 'interaction-only',
      callback: token => { turnstileToken = token; },
      'expired-callback': () => { turnstileToken = ''; },
      'error-callback': () => { turnstileToken = ''; }
    });
  } catch (error) {
    console.error(error);
    showToast('A proteção anti-bot não carregou. Tente atualizar a página.');
  }
}

function resetTurnstile() {
  turnstileToken = '';
  if (turnstileWidgetId !== null && window.turnstile?.reset) {
    try { window.turnstile.reset(turnstileWidgetId); } catch {}
  }
}

function base64UrlToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

function pushIsSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getPushRegistration() {
  if (!pushIsSupported()) return null;
  return navigator.serviceWorker.register('./sw.js');
}

async function getCurrentPushSubscription() {
  const registration = await getPushRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

async function updatePushUi() {
  if (!pushToggleButton || !pushStatus || !saveRemindersButton) return;
  if (!currentUser) {
    pushToggleButton.disabled = true;
    saveRemindersButton.disabled = true;
    pushToggleButton.textContent = 'Ativar notificações';
    pushStatus.textContent = 'Entre na sua conta para ativar o push.';
    return;
  }
  if (!pushIsSupported()) {
    pushToggleButton.disabled = true;
    saveRemindersButton.disabled = false;
    pushStatus.textContent = 'Este navegador não oferece notificações push.';
    return;
  }
  pushToggleButton.disabled = false;
  saveRemindersButton.disabled = false;
  const subscription = await getCurrentPushSubscription();
  if (subscription && Notification.permission === 'granted') {
    pushToggleButton.textContent = 'Desativar notificações';
    pushStatus.textContent = 'Push ativo neste navegador.';
  } else {
    pushToggleButton.textContent = 'Ativar notificações';
    pushStatus.textContent = Notification.permission === 'denied'
      ? 'Notificações bloqueadas nas permissões do navegador.'
      : 'Ative o push para receber os lembretes selecionados.';
  }
}

async function loadReminderPreferences() {
  if (!currentUser || !supabaseClient || !reminder24h || !reminder2h) return;
  const { data, error } = await supabaseClient
    .from('agendaleve_reminder_preferences')
    .select('enabled,push_enabled,reminder_minutes')
    .eq('owner_id', currentUser.id)
    .maybeSingle();
  if (error) {
    console.warn('Preferências de lembrete indisponíveis:', error.message);
    return;
  }
  const minutes = data?.reminder_minutes || [1440, 120];
  reminder24h.checked = minutes.includes(1440);
  reminder2h.checked = minutes.includes(120);
}

async function saveReminderPreferences(showConfirmation = true) {
  if (!currentUser || !supabaseClient) {
    showToast('Entre na sua conta para salvar lembretes.');
    return false;
  }
  const minutes = [];
  if (reminder24h?.checked) minutes.push(1440);
  if (reminder2h?.checked) minutes.push(120);
  if (!minutes.length) {
    showToast('Escolha pelo menos um lembrete.');
    return false;
  }
  const { error } = await supabaseClient
    .from('agendaleve_reminder_preferences')
    .upsert({
      owner_id: currentUser.id,
      enabled: true,
      push_enabled: true,
      reminder_minutes: minutes,
      updated_at: new Date().toISOString()
    });
  if (error) {
    console.error(error);
    showToast('Não foi possível salvar os lembretes.');
    return false;
  }
  if (showConfirmation) showToast('Lembretes salvos.');
  return true;
}

async function enablePushNotifications() {
  if (!currentUser || !supabaseClient || !pushIsSupported()) return;
  const publicKey = window.AGENDALEVE_SUPABASE?.pushVapidPublicKey;
  if (!publicKey) {
    showToast('Push ainda não está configurado.');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    await updatePushUi();
    return;
  }
  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey)
    });
  }
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('invalid_push_subscription');
  }
  const { error } = await supabaseClient
    .from('agendaleve_push_subscriptions')
    .upsert({
      owner_id: currentUser.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id,endpoint' });
  if (error) throw error;
  await saveReminderPreferences(false);
  await registration.showNotification('AgendaLeve', {
    body: 'Notificações ativadas. Você receberá lembretes dos próximos atendimentos.',
    tag: 'agendaleve-push-enabled'
  });
  await trackBetaEvent('push_enabled', { permission: 'granted' }, 'owner');
  await updatePushUi();
  showToast('Notificações ativadas.');
}

async function disablePushNotifications() {
  if (!currentUser || !supabaseClient || !pushIsSupported()) return;
  const subscription = await getCurrentPushSubscription();
  if (!subscription) {
    await updatePushUi();
    return;
  }
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabaseClient
    .from('agendaleve_push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('owner_id', currentUser.id)
    .eq('endpoint', endpoint);
  await updatePushUi();
  showToast('Notificações desativadas neste navegador.');
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

function maskPhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPrice(value) {
  const amount = Number(value) || 0;
  if (amount <= 0) return 'Grátis';
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

function hoursForDay(config, weekday) {
  const row = config.hoursByDay?.[weekday] || config.hoursByDay?.[String(weekday)];
  if (row) return row;
  if (config.days?.includes(Number(weekday))) {
    return { opensAt: config.opensAt || '08:00', closesAt: config.closesAt || '19:00' };
  }
  return null;
}

function weeklyHoursSummary(config) {
  const active = (config.days || []).map(day => hoursForDay(config, day)).filter(Boolean);
  if (!active.length) return '—';
  const unique = new Set(active.map(row => `${row.opensAt}–${row.closesAt}`));
  return unique.size === 1 ? [...unique][0] : 'Horários por dia';
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

  const ownerDashboard = name === 'agenda' && !publicMode;
  if (introSection) introSection.hidden = !ownerDashboard;
  if (plansSection) plansSection.hidden = !ownerDashboard;

  if (name === 'reservas') {
    updateBookingSummary();
    refreshAvailability();
  }
  if (name === 'configuracao') fillSettings();
}

function bookingStatusLabel(status) {
  return ({
    pending: 'Pendente',
    confirmed: 'Confirmada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    no_show: 'Não compareceu'
  })[status] || 'Reserva';
}

function renderSetupProgress(config) {
  const card = document.querySelector('#setup-card');
  if (!card) return;

  const hasBusiness = Boolean(currentBusiness) || String(config.businessName || '').trim().toLocaleLowerCase('pt-BR') !== 'meu negócio';
  const hasService = config.services.some(service => service.id !== 'service-initial' || Number(service.price) > 0 || service.name !== 'Atendimento inicial');
  const isPublic = Boolean(currentUser && currentBusiness?.is_public);
  const states = [
    ['#setup-business', hasBusiness],
    ['#setup-service', hasService],
    ['#setup-public', isPublic]
  ];
  const completed = states.filter(([, done]) => done).length;

  states.forEach(([selector, done]) => {
    const item = document.querySelector(selector);
    item?.classList.toggle('done', done);
    const marker = item?.querySelector('.setup-check');
    if (marker) marker.textContent = done ? '✓' : marker.dataset.step || marker.textContent;
  });

  document.querySelectorAll('.setup-check').forEach((marker, index) => {
    if (!marker.dataset.step) marker.dataset.step = String(index + 1);
    if (!marker.closest('li')?.classList.contains('done')) marker.textContent = marker.dataset.step;
  });

  const progress = document.querySelector('#setup-progress-text');
  if (progress) {
    progress.textContent = completed === 3
      ? 'Sua agenda está pronta para receber reservas pelo link público.'
      : `${completed} de 3 etapas concluídas. Complete o restante para publicar sua agenda.`;
  }

  card.hidden = completed === 3;
}

function publicBookingUrl() {
  if (!currentBusiness?.slug) return '';
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('negocio', currentBusiness.slug);
  return url.toString();
}

async function copyPublicBookingLink() {
  if (!currentBusiness?.is_public) {
    showToast('Ative o link público e salve primeiro.');
    return;
  }
  try {
    await navigator.clipboard.writeText(publicBookingUrl());
    showToast('Link público copiado.');
  } catch {
    showToast('Não foi possível copiar o link.');
  }
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
  const search = String(bookingSearch?.value || '').trim().toLocaleLowerCase('pt-BR');
  let bookings = allBookings.filter(booking => {
    const starts = new Date(`${booking.date}T${booking.time}:00`);
    const matchesPeriod = period === 'all'
      || (period === 'today' && booking.date === today)
      || (period === 'upcoming' && starts >= now)
      || (period === 'past' && starts < now);
    const matchesStatus = status === 'all'
      || (status === 'active' && (booking.status === 'pending' || booking.status === 'confirmed'))
      || booking.status === status;
    const haystack = [booking.client, booking.phone, booking.service]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    const matchesSearch = !search || haystack.includes(search);
    return matchesPeriod && matchesStatus && matchesSearch;
  });

  bookings.sort((a, b) => {
    const comparison = `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
    return period === 'past' ? -comparison : comparison;
  });

  document.querySelector('#business-name-card').textContent = config.businessName;
  document.querySelector('#stat-upcoming').textContent = String(upcomingActive.length);
  document.querySelector('#stat-services').textContent = String(config.services.length);
  document.querySelector('#stat-hours').textContent = weeklyHoursSummary(config);
  renderSetupProgress(config);
  const filterCount = document.querySelector('#booking-filter-count');
  if (filterCount) filterCount.textContent = bookings.length === 1 ? '1 agendamento neste filtro.' : `${bookings.length} agendamentos neste filtro.`;

  bookingList.innerHTML = bookings.length
    ? bookings.map(booking => {
      const actions = booking.status === 'pending'
        ? `<button class="text-button" type="button" data-booking-action="confirm" data-booking-id="${escapeHtml(booking.id)}">Confirmar</button><button class="text-button danger" type="button" data-booking-action="cancel" data-booking-id="${escapeHtml(booking.id)}">Cancelar</button>`
        : booking.status === 'confirmed'
          ? `<button class="text-button" type="button" data-booking-action="complete" data-booking-id="${escapeHtml(booking.id)}">Concluir</button><button class="text-button" type="button" data-booking-action="no_show" data-booking-id="${escapeHtml(booking.id)}">Não compareceu</button><button class="text-button danger" type="button" data-booking-action="cancel" data-booking-id="${escapeHtml(booking.id)}">Cancelar</button>`
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
    : `<div class="empty empty-with-action">
        <strong>${allBookings.length ? 'Nenhum agendamento neste filtro.' : 'Sua agenda ainda está vazia.'}</strong>
        <span>${allBookings.length ? 'Tente outro período ou status.' : 'Crie um atendimento manualmente ou publique seu link para receber a primeira reserva.'}</span>
        <button class="secondary compact" type="button" data-empty-go="reservas">Agendar cliente</button>
      </div>`;
}

function fillSettings() {
  const config = currentConfig();
  configForm.elements.businessName.value = config.businessName;
  configForm.elements.slotStep.value = String(config.slotStep);
  configForm.querySelectorAll('[name="dayEnabled"]').forEach(input => {
    const weekday = Number(input.value);
    const enabled = config.days.includes(weekday);
    const row = input.closest('.weekly-hours-row');
    const hours = hoursForDay(config, weekday) || { opensAt: '08:00', closesAt: '19:00' };
    input.checked = enabled;
    row.classList.toggle('enabled', enabled);
    row.querySelector(`[data-day-open="${weekday}"]`).value = hours.opensAt;
    row.querySelector(`[data-day-close="${weekday}"]`).value = hours.closesAt;
    row.querySelectorAll('input[type="time"]').forEach(field => field.disabled = !enabled);
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
        <div><strong>${escapeHtml(service.name)}</strong><span>${service.duration} min · ${formatPrice(service.price)}</span></div>
        <div class="service-actions">
          <button class="text-button" type="button" data-edit-service="${escapeHtml(service.id)}">Editar</button>
          <button class="text-button danger" type="button" data-remove-service="${escapeHtml(service.id)}" aria-label="Remover ${escapeHtml(service.name)}">Remover</button>
        </div>
      </article>`).join('')
    : '<div class="empty">Adicione ao menos um serviço para receber reservas.</div>';
}

function resetServiceEditor() {
  editingServiceId = null;
  serviceForm.reset();
  serviceForm.elements.duration.value = '60';
  serviceForm.querySelector('[type="submit"]').textContent = 'Adicionar serviço';
  document.querySelector('#cancel-service-edit').hidden = true;
}

function beginServiceEdit(id) {
  const service = currentConfig().services.find(item => item.id === id);
  if (!service) return;
  editingServiceId = id;
  serviceForm.elements.serviceName.value = service.name;
  serviceForm.elements.duration.value = String(service.duration);
  serviceForm.elements.price.value = Number(service.price) || '';
  serviceForm.querySelector('[type="submit"]').textContent = 'Salvar alterações';
  document.querySelector('#cancel-service-edit').hidden = false;
  serviceForm.elements.serviceName.focus();
}

function renderServiceOptions() {
  const config = currentConfig();
  const previous = bookingService.value;
  bookingService.innerHTML = config.services.length
    ? config.services.map(service => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)} · ${service.duration} min · ${formatPrice(service.price)}</option>`).join('')
    : '<option value="">Nenhum serviço cadastrado</option>';
  if (config.services.some(service => service.id === previous)) bookingService.value = previous;
  const enabled = config.services.length > 0;
  bookingService.disabled = !enabled;
  bookingForm.querySelector('[type="submit"]').disabled = !enabled;

  document.querySelector('#booking-business-name').textContent = config.businessName;
  const selectedWeekday = bookingDate.value ? new Date(`${bookingDate.value}T00:00:00`).getDay() : null;
  const selectedHours = selectedWeekday === null ? null : hoursForDay(config, selectedWeekday);
  document.querySelector('#booking-hours').textContent = selectedHours
    ? `${selectedHours.opensAt}–${selectedHours.closesAt}`
    : weeklyHoursSummary(config);
  updateBookingSummary();
}

function availableTimesLocal(date, service) {
  const config = currentConfig();
  if (!service || !date) return [];
  const selectedDate = new Date(`${date}T00:00:00`);
  if (!config.days.includes(selectedDate.getDay())) return [];

  const weekday = selectedDate.getDay();
  const dailyHours = hoursForDay(config, weekday);
  if (!dailyHours) return [];
  const open = minutesOf(dailyHours.opensAt);
  const close = minutesOf(dailyHours.closesAt);
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

async function fetchCloudAvailability(date, service, management = false) {
  if (!supabaseClient || !currentBusiness?.slug || !service?.id || !date) return [];
  const body = { businessSlug: currentBusiness.slug, serviceId: service.id, date };
  if (management && customerCancelMode) {
    body.bookingId = cancelBookingId;
    body.cancelToken = cancelToken;
  }
  const { data, error } = await supabaseClient.functions.invoke('booking-availability', { body });
  if (error) throw error;
  availableSlotMap = new Map((data?.slots || []).map(slot => [slot.time, slot.startsAt]));
  return (data?.slots || []).map(slot => slot.time);
}

function formatBookingSummaryDate(date) {
  if (!date) return 'Escolha uma data';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Escolha uma data';
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).replace('.', '');
}

function updateBookingSummary() {
  const config = currentConfig();
  const service = serviceById(bookingService.value || config.services[0]?.id);
  const date = bookingDate.value;
  const time = bookingTime.value;

  bookingSummaryService.textContent = service?.name || 'Escolha um serviço';
  bookingSummaryDuration.textContent = service ? `${service.duration} min` : '—';
  bookingSummaryPrice.textContent = service ? formatPrice(service.price) : '—';
  bookingSummaryDate.textContent = formatBookingSummaryDate(date);
  bookingSummaryTime.textContent = time || '—';

  if (!service) {
    bookingSummaryHelp.textContent = 'Cadastre ou escolha um serviço para começar.';
  } else if (!date) {
    bookingSummaryHelp.textContent = 'Agora escolha uma data para consultar os horários disponíveis.';
  } else if (!time) {
    bookingSummaryHelp.textContent = 'Escolha um horário disponível para concluir a reserva.';
  } else {
    bookingSummaryHelp.textContent = 'Confira os dados ao lado e preencha seu nome e telefone para reservar.';
  }
}

async function refreshAvailability() {
  const config = currentConfig();
  const service = serviceById(bookingService.value || config.services[0]?.id);
  const date = bookingDate.value;
  const dayName = date ? new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {weekday:'long'}) : '';
  const selectedWeekday = date ? new Date(`${date}T00:00:00`).getDay() : null;
  const selectedHours = selectedWeekday === null ? null : hoursForDay(config, selectedWeekday);
  const openDay = Boolean(selectedHours);
  document.querySelector('#booking-hours').textContent = selectedHours
    ? `${selectedHours.opensAt}–${selectedHours.closesAt}`
    : weeklyHoursSummary(config);

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

  updateBookingSummary();
}

function bookingManagementUrl(booking) {
  if (!publicSlug || !booking?.id || !booking?.cancelToken) return '';
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('negocio', publicSlug);
  url.searchParams.set('booking', booking.id);
  url.searchParams.set('cancel', booking.cancelToken);
  return url.toString();
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

  const managementUrl = bookingManagementUrl(booking);
  const cancelBox = document.querySelector('#cancel-link-box');
  cancelBox.hidden = !managementUrl;
  if (managementUrl) {
    document.querySelector('#cancel-reservation-link').href = managementUrl;
    document.querySelector('#copy-cancel-link').dataset.cancelUrl = managementUrl;
  }

  document.querySelector('#bookingFormLayout').hidden = true;
  document.querySelector('#bookingConfirmation').hidden = false;
  document.querySelector('#cancelBookingPanel').hidden = true;
  document.querySelector('#bookingConfirmation h2').focus();
}

function managementBackUrl() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('negocio', publicSlug);
  return url.toString();
}

function updateManagedBookingSummary() {
  if (!managedBooking || !currentBusiness) return;
  const local = inBusinessZone(managedBooking.startsAt, currentBusiness.timezone);
  const dateLabel = new Date(local.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  document.querySelector('#manage-current-booking').textContent =
    `${managedBooking.service.name} · ${dateLabel}, às ${local.time}`;
}

async function refreshRescheduleAvailability() {
  const dateInput = document.querySelector('#reschedule-date');
  const timeSelect = document.querySelector('#reschedule-time');
  const confirmButton = document.querySelector('#confirm-reschedule');
  const date = dateInput.value;
  const service = managedBooking?.service;
  timeSelect.disabled = true;
  confirmButton.disabled = true;
  timeSelect.innerHTML = '<option value="">Consultando horários…</option>';

  if (!date || !service) {
    timeSelect.innerHTML = '<option value="">Escolha uma data</option>';
    return;
  }

  try {
    const times = await fetchCloudAvailability(date, service, true);
    timeSelect.innerHTML = times.length
      ? '<option value="">Selecione um horário</option>' + times.map(time => `<option value="${time}">${time}</option>`).join('')
      : '<option value="">Nenhum horário disponível</option>';
    timeSelect.disabled = times.length === 0;
  } catch (error) {
    console.error(error);
    timeSelect.innerHTML = '<option value="">Não foi possível consultar agora</option>';
  }
}

async function loadManagedBooking() {
  const panel = document.querySelector('#cancelBookingPanel');
  panel.hidden = false;
  document.querySelector('#bookingFormLayout').hidden = true;
  document.querySelector('#bookingConfirmation').hidden = true;
  document.querySelector('#public-mode-name').textContent = 'Gerenciar reserva';
  document.querySelector('#backToBooking').href = managementBackUrl();
  document.querySelector('#cancelBookingTitle').focus();

  if (!supabaseClient) {
    document.querySelector('#cancelBookingText').textContent = 'Não foi possível conectar ao serviço de reservas.';
    return;
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke('booking-manage', {
      body: { bookingId: cancelBookingId, cancelToken }
    });
    if (error) throw error;

    currentBusiness = {
      slug: data.business.slug,
      name: data.business.name,
      timezone: data.business.timezone,
      slot_interval_minutes: Number(data.business.slotIntervalMinutes),
      is_public: true
    };
    activeConfig = {
      businessName: data.business.name,
      opensAt: data.hours[0]?.opens_at?.slice(0, 5) || '08:00',
      closesAt: data.hours[0]?.closes_at?.slice(0, 5) || '19:00',
      slotStep: Number(data.business.slotIntervalMinutes) || 30,
      days: (data.hours || []).map(row => Number(row.weekday)).sort((a, b) => a - b),
      services: [{
        id: data.service.id,
        name: data.service.name,
        duration: Number(data.service.duration),
        price: Number(data.service.price)
      }],
      isPublic: true,
      slug: data.business.slug
    };
    managedBooking = {
      ...data.booking,
      service: activeConfig.services[0]
    };

    document.querySelector('#public-mode-name').textContent = data.business.name;
    document.querySelector('#cancelBookingText').textContent = 'Você pode reagendar ou cancelar este horário usando este link privado.';
    document.querySelector('#reschedule-box').hidden = !data.service.active;
    document.querySelector('#manage-danger-zone').hidden = false;
    const dateInput = document.querySelector('#reschedule-date');
    dateInput.min = localDateString(new Date());
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 180);
    dateInput.max = localDateString(maxDate);
    updateManagedBookingSummary();
  } catch (error) {
    console.error(error);
    document.querySelector('#cancelBookingTitle').textContent = 'Reserva indisponível';
    document.querySelector('#cancelBookingText').textContent = 'Este link pode ter expirado, a reserva pode ter sido cancelada ou o horário já passou.';
    document.querySelector('#reschedule-box').hidden = true;
    document.querySelector('#manage-danger-zone').hidden = true;
  }
}

function showCustomerCancellationPanel() {
  loadManagedBooking();
}

function cloudConfigFromRows(business, hours, services) {
  const firstHours = hours[0];
  const hoursByDay = Object.fromEntries(hours.map(row => [Number(row.weekday), {
    opensAt: row.opens_at?.slice(0, 5) || '08:00',
    closesAt: row.closes_at?.slice(0, 5) || '19:00'
  }]));
  return {
    businessName: business.name,
    opensAt: firstHours?.opens_at?.slice(0, 5) || '08:00',
    closesAt: firstHours?.closes_at?.slice(0, 5) || '19:00',
    slotStep: Number(business.slot_interval_minutes) || 30,
    days: hours.map(row => Number(row.weekday)).sort((a, b) => a - b),
    hoursByDay,
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

async function saveCloudSettings(values, schedule) {
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

  if (schedule.length) {
    const rows = schedule.map(item => ({
      business_id: business.id,
      weekday: item.weekday,
      opens_at: item.opensAt,
      closes_at: item.closesAt
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
  const dashboardCopyLink = document.querySelector('#dashboard-copy-link');
  callout.hidden = Boolean(currentUser);
  linkCard.hidden = !(currentUser && currentBusiness);
  if (dashboardCopyLink) dashboardCopyLink.hidden = !Boolean(currentUser && currentBusiness?.is_public);

  if (currentUser && currentBusiness) {
    document.querySelector('#public-link-text').textContent = currentBusiness.is_public
      ? publicBookingUrl()
      : 'Ative “Aceitar reservas pelo link público” e salve para liberar o link.';
  }

  renderSetupProgress(currentConfig());
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
  const schedule = Array.from(configForm.querySelectorAll('[name="dayEnabled"]:checked')).map(input => {
    const weekday = Number(input.value);
    return {
      weekday,
      opensAt: configForm.querySelector(`[data-day-open="${weekday}"]`).value,
      closesAt: configForm.querySelector(`[data-day-close="${weekday}"]`).value
    };
  });
  if (!schedule.length) {
    showToast('Selecione pelo menos um dia de atendimento.');
    return;
  }
  const invalidDay = schedule.find(item => !item.opensAt || !item.closesAt || minutesOf(item.closesAt) <= minutesOf(item.opensAt));
  if (invalidDay) {
    showToast('Revise os horários: o fechamento precisa ser depois da abertura.');
    return;
  }

  if (currentUser) {
    const button = configForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await saveCloudSettings(values, schedule);
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
  const days = schedule.map(item => item.weekday);
  const hoursByDay = Object.fromEntries(schedule.map(item => [item.weekday, {
    opensAt: item.opensAt,
    closesAt: item.closesAt
  }]));
  const first = schedule[0];
  activeConfig = {
    ...current,
    businessName: values.businessName.trim(),
    opensAt: first.opensAt,
    closesAt: first.closesAt,
    slotStep: Number(values.slotStep),
    days,
    hoursByDay,
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

    if (editingServiceId) {
      const { data, error } = await supabaseClient.from('agendaleve_services')
        .update({
          name: service.name,
          duration_minutes: service.duration,
          price_cents: Math.round(service.price * 100)
        })
        .eq('id', editingServiceId)
        .select('*')
        .single();
      if (error) {
        showToast('Não foi possível atualizar o serviço.');
        return;
      }
      activeConfig.services = activeConfig.services.map(item => item.id === editingServiceId ? {
        id: data.id,
        name: data.name,
        duration: Number(data.duration_minutes),
        price: Number(data.price_cents) / 100
      } : item);
    } else {
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
    }
  } else {
    const current = readLocalConfig();
    if (editingServiceId) {
      current.services = current.services.map(item => item.id === editingServiceId ? { ...item, ...service } : item);
    } else {
      current.services.push({
        id: crypto.randomUUID?.() || `service-${Date.now()}`,
        ...service
      });
    }
    activeConfig = current;
    writeLocalConfig(current);
  }

  const edited = Boolean(editingServiceId);
  resetServiceEditor();
  renderAll();
  showToast(edited ? 'Serviço atualizado.' : 'Serviço adicionado.');
});

serviceList.addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-service]');
  if (editButton) {
    beginServiceEdit(editButton.dataset.editService);
    return;
  }

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

  if (editingServiceId === id) resetServiceEditor();
  renderAll();
  showToast('Serviço removido.');
});

document.querySelector('#cancel-service-edit').addEventListener('click', resetServiceEditor);

configForm.querySelectorAll('[name="dayEnabled"]').forEach(input => {
  input.addEventListener('change', event => {
    const weekday = Number(event.currentTarget.value);
    const row = event.currentTarget.closest('.weekly-hours-row');
    const enabled = event.currentTarget.checked;
    row.classList.toggle('enabled', enabled);
    row.querySelectorAll('input[type="time"]').forEach(field => {
      field.disabled = !enabled;
      if (enabled && !field.value) field.value = field.hasAttribute('data-day-open') ? '08:00' : '19:00';
    });
  });
});

bookingService.addEventListener('change', refreshAvailability);
bookingDate.addEventListener('change', refreshAvailability);
bookingTime.addEventListener('change', updateBookingSummary);
bookingForm.elements.phone.addEventListener('input', event => {
  event.currentTarget.value = maskPhoneInput(event.currentTarget.value);
});

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
        cancelToken: data?.cancelToken || '',
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

document.querySelector('#copy-cancel-link').addEventListener('click', async event => {
  const url = event.currentTarget.dataset.cancelUrl;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link de cancelamento copiado.');
  } catch {
    showToast('Não foi possível copiar o link.');
  }
});

document.querySelector('#reschedule-date').addEventListener('change', refreshRescheduleAvailability);
document.querySelector('#reschedule-time').addEventListener('change', event => {
  document.querySelector('#confirm-reschedule').disabled = !event.currentTarget.value;
});

document.querySelector('#confirm-reschedule').addEventListener('click', async event => {
  if (!supabaseClient || !customerCancelMode || !managedBooking) return;
  const time = document.querySelector('#reschedule-time').value;
  const startsAt = availableSlotMap.get(time);
  if (!startsAt) {
    showToast('Escolha um horário disponível.');
    return;
  }

  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { data, error } = await supabaseClient.functions.invoke('reschedule-booking', {
      body: { bookingId: cancelBookingId, cancelToken, startsAt }
    });
    if (error) throw error;
    managedBooking.startsAt = data.startsAt;
    managedBooking.endsAt = data.endsAt;
    updateManagedBookingSummary();
    document.querySelector('#reschedule-date').value = '';
    document.querySelector('#reschedule-time').innerHTML = '<option value="">Escolha uma data</option>';
    document.querySelector('#reschedule-time').disabled = true;
    showToast('Reserva reagendada com sucesso.');
  } catch (error) {
    console.error(error);
    await refreshRescheduleAvailability();
    showToast('Esse horário pode ter acabado de ser reservado. Escolha outro.');
  } finally {
    button.disabled = true;
  }
});

document.querySelector('#confirmCustomerCancellation').addEventListener('click', async event => {
  if (!supabaseClient || !customerCancelMode) return;
  if (!window.confirm('Cancelar definitivamente esta reserva?')) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { error } = await supabaseClient.functions.invoke('cancel-booking', {
      body: { bookingId: cancelBookingId, cancelToken }
    });
    if (error) throw error;
    document.querySelector('#cancelBookingTitle').textContent = 'Reserva cancelada';
    document.querySelector('#cancelBookingText').textContent = 'O horário foi liberado. Se precisar, você pode fazer um novo agendamento.';
    document.querySelector('#reschedule-box').hidden = true;
    document.querySelector('#manage-danger-zone').hidden = true;
    document.querySelector('#backToBooking').textContent = 'Fazer novo agendamento →';
  } catch (error) {
    console.error(error);
    showToast('Esta reserva não pode mais ser cancelada por este link.');
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
bookingSearch?.addEventListener('input', renderDashboard);

bookingList.addEventListener('click', async event => {
  const emptyAction = event.target.closest('[data-empty-go]');
  if (emptyAction) {
    switchView(emptyAction.dataset.emptyGo);
    return;
  }

  const button = event.target.closest('[data-booking-action]');
  if (!button) return;
  const action = button.dataset.bookingAction;
  const id = button.dataset.bookingId;
  const nextStatus = action === 'confirm' ? 'confirmed'
    : action === 'complete' ? 'completed'
    : action === 'no_show' ? 'no_show'
    : action === 'cancel' ? 'cancelled'
    : '';
  if (!nextStatus || !id) return;

  const prompts = {
    confirmed: 'Confirmar este agendamento?',
    completed: 'Marcar este atendimento como concluído?',
    no_show: 'Marcar que o cliente não compareceu?',
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
    no_show: 'Marcado como não compareceu.',
    cancelled: 'Agendamento cancelado.'
  };
  showToast(messages[nextStatus]);
});

function csvCell(value) {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportBookingsCsv() {
  const bookings = [...currentBookings()].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  if (!bookings.length) {
    showToast('Ainda não há agendamentos para exportar.');
    return;
  }
  const rows = [
    ['Data','Hora','Cliente','Telefone','Serviço','Duração (min)','Valor','Status'],
    ...bookings.map(booking => [
      booking.date,
      booking.time,
      booking.client,
      formatPhone(booking.phone),
      booking.service,
      booking.duration,
      Number(booking.price || 0).toFixed(2).replace('.', ','),
      bookingStatusLabel(booking.status)
    ])
  ];
  const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agendaleve-${localDateString(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Agenda exportada em CSV.');
}

exportBookingsButton?.addEventListener('click', exportBookingsCsv);
document.querySelector('#copy-public-link').addEventListener('click', copyPublicBookingLink);
document.querySelector('#dashboard-copy-link').addEventListener('click', copyPublicBookingLink);

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
    introSection.hidden = true;
    plansSection.hidden = true;
    document.querySelector('#public-mode-banner').hidden = false;
    document.querySelector('#view-reservas').hidden = false;
    if (customerCancelMode) {
      showCustomerCancellationPanel();
      return;
    }
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
