const { test, expect } = require('@playwright/test');

function nextWeekday(targetWeekday) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  let delta = (targetWeekday - date.getDay() + 7) % 7;
  if (delta < 2) delta += 7;
  date.setDate(date.getDate() + delta);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/cdn.jsdelivr.net/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Mais tempo atendendo/i })).toBeVisible();
});


test('mantém PT-BR como padrão e permite alternar para inglês com persistência', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { name: /Mais tempo atendendo/i })).toBeVisible();

  await page.locator('[data-language="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: /More time serving clients/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Business settings' })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: /More time serving clients/i })).toBeVisible();

  await page.locator('[data-language="pt-BR"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { name: /Mais tempo atendendo/i })).toBeVisible();
});

test('configura expediente, edita serviço, reserva e encontra cliente na agenda', async ({ page }) => {
  await page.getByRole('button', { name: 'Configurar negócio' }).click();

  await page.locator('#settings-business-name').fill('Studio E2E');
  const tuesday = page.locator('.weekly-hours-row[data-weekday="2"]');
  await expect(tuesday.locator('input[name="dayEnabled"]')).toBeChecked();
  await tuesday.locator('[data-day-open="2"]').fill('10:00');
  await tuesday.locator('[data-day-close="2"]').fill('12:00');
  await page.getByRole('button', { name: 'Salvar informações' }).click();
  await expect(page.locator('#stat-hours')).toHaveText('Horários por dia');

  await page.locator('input[name="serviceName"]').fill('Consulta E2E');
  await page.locator('select[name="duration"]').selectOption('30');
  await page.locator('input[name="price"]').fill('50');
  await page.getByRole('button', { name: 'Adicionar serviço' }).click();
  await expect(page.locator('#service-list')).toContainText('Consulta E2E');

  const serviceRow = page.locator('.service-row').filter({ hasText: 'Consulta E2E' });
  await serviceRow.getByRole('button', { name: 'Editar' }).click();
  await page.locator('input[name="serviceName"]').fill('Consulta Premium E2E');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('#service-list')).toContainText('Consulta Premium E2E');

  await page.getByRole('button', { name: 'Página do cliente' }).click();

  const optionValue = await page.locator('#booking-service option').evaluateAll(options => {
    const option = options.find(item => item.textContent.includes('Consulta Premium E2E'));
    return option?.value || '';
  });
  expect(optionValue).not.toBe('');
  await page.locator('#booking-service').selectOption(optionValue);

  const date = nextWeekday(2);
  await page.locator('#booking-date').fill(date);
  await expect(page.locator('#booking-hours')).toHaveText('10:00–12:00');
  await expect(page.locator('#booking-time')).toBeEnabled();
  await page.locator('#booking-time').selectOption('10:00');

  await page.locator('input[name="client"]').fill('Cliente E2E');
  await page.locator('input[name="phone"]').fill('11999998888');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByRole('heading', { name: 'Seu horário está reservado!' })).toBeVisible();

  await page.getByRole('button', { name: 'Minha agenda' }).click();
  await page.locator('#booking-search').fill('Cliente E2E');
  await expect(page.locator('#booking-list')).toContainText('Cliente E2E');
  await expect(page.locator('#booking-list')).toContainText('Consulta Premium E2E');
  await expect(page.locator('#booking-list')).toContainText('Confirmada');
});

test('telefone recebe máscara e serviço grátis usa texto amigável', async ({ page }) => {
  await page.getByRole('button', { name: 'Página do cliente' }).click();
  await expect(page.locator('#booking-service')).toContainText('Grátis');

  const phone = page.locator('input[name="phone"]');
  await phone.fill('11987654321');
  await expect(phone).toHaveValue('(11) 98765-4321');
});
