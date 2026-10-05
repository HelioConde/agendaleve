const form = document.querySelector('#form');
const list = document.querySelector('#list');
const storageKey = 'agendaleve-bookings';

function readBookings() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
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
  window.setTimeout(() => toast.classList.remove('on'), 1800);
}

function refresh() {
  const bookings = readBookings().sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  list.innerHTML = bookings.length
    ? bookings.map(booking => `
      <div class="item">
        <div><strong>${escapeHtml(booking.client)} · ${escapeHtml(booking.service)}</strong>
          <small>${new Date(`${booking.date}T00:00:00`).toLocaleDateString('pt-BR')} às ${escapeHtml(booking.time)}</small>
        </div>
        <button class="secondary" type="button" data-id="${escapeHtml(booking.id)}">Cancelar</button>
      </div>`).join('')
    : '<div class="empty">Nenhum horário agendado ainda. Cadastre um para testar o fluxo.</div>';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const values = Object.fromEntries(new FormData(form));
  const requestedDate = new Date(`${values.f2}T${values.f3}:00`);
  if (Number.isNaN(requestedDate.getTime()) || requestedDate <= new Date()) {
    showToast('Escolha uma data e um horário futuros.');
    return;
  }

  const bookings = readBookings();
  const collision = bookings.some(item => item.date === values.f2 && item.time === values.f3);
  if (collision) {
    showToast('Esse horário já está ocupado. Escolha outro.');
    return;
  }

  bookings.push({
    id: crypto.randomUUID?.() || String(Date.now()),
    client: values.f0.trim(), service: values.f1.trim(), date: values.f2, time: values.f3
  });
  localStorage.setItem(storageKey, JSON.stringify(bookings));
  form.reset();
  refresh();
  showToast('Agendamento salvo neste navegador.');
});

list.addEventListener('click', event => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  const bookings = readBookings().filter(item => item.id !== button.dataset.id);
  localStorage.setItem(storageKey, JSON.stringify(bookings));
  refresh();
  showToast('Agendamento cancelado.');
});

const dateInput = form.querySelector('[name="f2"]');
dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
refresh();
