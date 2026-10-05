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
  services: [
    { id: 'service-initial', name: 'Atendimento inicial', duration: 60, price: 0 }
  ]
};

const configForm = document.querySelector('#settings-form');
const serviceForm = document.querySelector('#service-form');
const bookingForm = document.querySelector('#booking-form');
const bookingService = document.querySelector('#booking-service');
const bookingDate = document.querySelector('#booking-date');
const bookingTime = document.querySelector('#booking-time');
const bookingList = document.querySelector('#booking-list');
const serviceList = document.querySelector('#service-list');

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readConfig() {
  const stored = readJson(STORAGE.config, {});
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    days: Array.isArray(stored.days) ? stored.days : DEFAULT_CONFIG.days,
    services: Array.isArray(stored.services) ? stored.services : DEFAULT_CONFIG.services
  };
}

function writeConfig(config) {
  localStorage.setItem(STORAGE.config, JSON.stringify(config));
}

function readBookings() {
  const stored = readJson(STORAGE.bookings, []);
  if (!Array.isArray(stored)) return [];
  return stored.map((booking, index) => ({
    id: booking.id || `legacy-${index}`,
    client: booking.client || '',
    service: booking.service || 'Atendimento',
    serviceId: booking.serviceId || '',
    date: booking.date,
    time: booking.time,
    duration: Number(booking.duration) || 60,
    price: Number(booking.price) || 0
  }));
}

function writeBookings(bookings) {
  localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
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
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function timeOf(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const rest = String(minutes % 60).padStart(2, '0');
  return `${hours}:${rest}`;
}

function serviceById(id) {
  return readConfig().services.find(service => service.id === id);
}

function switchView(name) {
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

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short'
  });
}

function renderDashboard() {
  const config = readConfig();
  const now = new Date();
  const bookings = readBookings()
    .filter(booking => new Date(`${booking.date}T${booking.time}:00`) >= now)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  document.querySelector('#business-name-card').textContent = config.businessName;
  document.querySelector('#stat-upcoming').textContent = String(bookings.length);
  document.querySelector('#stat-services').textContent = String(config.services.length);
  document.querySelector('#stat-hours').textContent = `${config.opensAt}–${config.closesAt}`;

  bookingList.innerHTML = bookings.length
    ? bookings.map(booking => `
      <article class="booking-row">
        <div class="booking-date"><strong>${formatDate(booking.date)}</strong><span>${escapeHtml(booking.time)}</span></div>
        <div class="booking-info"><strong>${escapeHtml(booking.client)}</strong><span>${escapeHtml(booking.service)} · ${booking.duration} min</span></div>
        <button class="text-button" type="button" data-cancel="${escapeHtml(booking.id)}">Cancelar</button>
      </article>`).join('')
    : '<div class="empty"><strong>Sua agenda começa aqui.</strong><span>Configure seus serviços e experimente uma reserva demonstrativa.</span></div>';
}

function fillSettings() {
  const config = readConfig();
  configForm.elements.businessName.value = config.businessName;
  configForm.elements.opensAt.value = config.opensAt;
  configForm.elements.closesAt.value = config.closesAt;
  configForm.elements.slotStep.value = String(config.slotStep);
  configForm.querySelectorAll('[name="days"]').forEach(input => {
    input.checked = config.days.includes(Number(input.value));
  });
  renderServices();
}

function renderServices() {
  const config = readConfig();
  serviceList.innerHTML = config.services.length
    ? config.services.map(service => `
      <article class="service-row">
        <div><strong>${escapeHtml(service.name)}</strong><span>${service.duration} min · ${Number(service.price).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
        <button class="text-button danger" type="button" data-remove-service="${escapeHtml(service.id)}" aria-label="Remover ${escapeHtml(service.name)}">Remover</button>
      </article>`).join('')
    : '<div class="empty">Adicione ao menos um serviço para receber reservas.</div>';
}

function renderServiceOptions() {
  const config = readConfig();
  const previous = bookingService.value;
  bookingService.innerHTML = config.services.length
    ? config.services.map(service => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)} · ${service.duration} min · ${Number(service.price).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</option>`).join('')
    : '<option value="">Nenhum serviço cadastrado</option>';
  if (config.services.some(service => service.id === previous)) bookingService.value = previous;
  const enabled = config.services.length > 0;
  bookingService.disabled = !enabled;
  bookingForm.querySelector('[type="submit"]').disabled = !enabled;
}

function availableTimes(date, service) {
  const config = readConfig();
  if (!service || !date) return [];
  const selectedDate = new Date(`${date}T00:00:00`);
  if (!config.days.includes(selectedDate.getDay())) return [];

  const open = minutesOf(config.opensAt);
  const close = minutesOf(config.closesAt);
  const duration = Number(service.duration);
  const today = new Date();
  const isToday = date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const bookings = readBookings().filter(booking => booking.date === date);
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

function refreshAvailability() {
  const config = readConfig();
  const service = serviceById(bookingService.value || config.services[0]?.id);
  const date = bookingDate.value;
  const dayName = date ? new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {weekday:'long'}) : '';
  const openDay = date && config.days.includes(new Date(`${date}T00:00:00`).getDay());
  const times = availableTimes(date, service);

  bookingTime.innerHTML = times.length
    ? times.map(time => `<option value="${time}">${time}</option>`).join('')
    : '<option value="">Nenhum horário disponível</option>';
  bookingTime.disabled = times.length === 0;
  bookingForm.querySelector('[type="submit"]').disabled = times.length === 0;

  if (!date) bookingTime.firstElementChild.textContent = 'Escolha uma data';
  else if (!openDay) bookingTime.firstElementChild.textContent = `Sem atendimento: ${dayName}`;
  else if (!service) bookingTime.firstElementChild.textContent = 'Cadastre um serviço';

  document.querySelector('#booking-business-name').textContent = config.businessName;
  document.querySelector('#booking-hours').textContent = `${config.opensAt}–${config.closesAt}`;
}

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});
document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.go));
});

configForm.addEventListener('submit', event => {
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

  const current = readConfig();
  writeConfig({
    ...current,
    businessName: values.businessName.trim(),
    opensAt: values.opensAt,
    closesAt: values.closesAt,
    slotStep: Number(values.slotStep),
    days
  });
  renderDashboard();
  renderServiceOptions();
  refreshAvailability();
  showToast('Informações do negócio salvas neste navegador.');
});

serviceForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!serviceForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(serviceForm));
  const current = readConfig();
  current.services.push({
    id: crypto.randomUUID?.() || `service-${Date.now()}`,
    name: values.serviceName.trim(),
    duration: Number(values.duration),
    price: Number(values.price) || 0
  });
  writeConfig(current);
  serviceForm.reset();
  serviceForm.elements.duration.value = '30';
  renderServices();
  renderServiceOptions();
  renderDashboard();
  refreshAvailability();
  showToast('Serviço adicionado.');
});

serviceList.addEventListener('click', event => {
  const button = event.target.closest('[data-remove-service]');
  if (!button) return;
  if (!window.confirm('Remover este serviço das próximas reservas? Os atendimentos já marcados serão mantidos.')) return;
  const config = readConfig();
  config.services = config.services.filter(service => service.id !== button.dataset.removeService);
  writeConfig(config);
  renderServices();
  renderServiceOptions();
  renderDashboard();
  refreshAvailability();
});

bookingService.addEventListener('change', refreshAvailability);
bookingDate.addEventListener('change', refreshAvailability);

bookingForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!bookingForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(bookingForm));
  const config = readConfig();
  const service = config.services.find(item => item.id === values.serviceId);
  if (!service) {
    showToast('Escolha um serviço disponível.');
    return;
  }
  const available = availableTimes(values.date, service);
  if (!available.includes(values.time)) {
    refreshAvailability();
    showToast('Esse horário não está mais disponível. Escolha outro.');
    return;
  }

  const bookings = readBookings();
  bookings.push({
    id: crypto.randomUUID?.() || `booking-${Date.now()}`,
    client: values.client.trim(),
    serviceId: service.id,
    service: service.name,
    duration: Number(service.duration),
    price: Number(service.price),
    date: values.date,
    time: values.time
  });
  writeBookings(bookings);
  bookingForm.reset();
  bookingDate.min = localDateString(new Date());
  bookingDate.value = '';
  renderServiceOptions();
  refreshAvailability();
  renderDashboard();
  showToast('Reserva de demonstração confirmada.');
  switchView('agenda');
});

bookingList.addEventListener('click', event => {
  const button = event.target.closest('[data-cancel]');
  if (!button) return;
  if (!window.confirm('Cancelar este horário da demonstração?')) return;
  writeBookings(readBookings().filter(booking => booking.id !== button.dataset.cancel));
  renderDashboard();
  renderServiceOptions();
  refreshAvailability();
  showToast('Agendamento cancelado.');
});

function localDateString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function initialize() {
  if (!localStorage.getItem(STORAGE.config)) writeConfig(DEFAULT_CONFIG);
  bookingDate.min = localDateString(new Date());
  fillSettings();
  renderServiceOptions();
  renderDashboard();
  refreshAvailability();
}

initialize();
