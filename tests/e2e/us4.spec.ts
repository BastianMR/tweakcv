import { expect, test } from '@playwright/test'

test('US4: generar → evaluar ATS → regenerar desde sugerencia → hijo en historial', async ({ page }) => {
  // perfil activo + materia prima
  await page.goto('/')
  const landing = page.getByTestId('profile-page').or(page.getByTestId('onboarding'))
  await expect(landing).toBeVisible()
  if (await page.getByTestId('onboarding').isVisible()) {
    const ob = page.getByTestId('onboarding')
    await ob.getByPlaceholder('Nombre del perfil').fill(`Dev QA ${Date.now()}`)
    await ob.locator('button').click()
  }
  await expect(page.getByTestId('profile-page')).toBeVisible({ timeout: 10_000 })

  // experiencia para el CV (idempotente si la base ya tiene de runs previos)
  await page.goto('/perfil')
  const expSection = page.locator('section[data-section="Experiencia"]')
  if (!(await expSection.locator('li').first().isVisible().catch(() => false))) {
    await expSection.getByLabel('Company').fill('Acme Corp')
    await expSection.getByLabel('Role').fill('Backend Developer')
    await expSection.locator('form').locator('button').click()
    await expect(expSection.locator('li').first()).toContainText('Acme Corp', { timeout: 10_000 })
  }

  // posting
  await page.goto('/postulaciones')
  const postingText = 'Buscamos Backend Developer con TypeScript, Node.js y PostgreSQL.'
  await page.getByTestId('posting-text').fill(postingText)
  await page.getByTestId('parse-posting-btn').click()
  await expect(page.locator('[data-testid^="posting-"]').first()).toContainText(
    'Backend Developer',
    { timeout: 15_000 },
  )

  // studio: seleccionar posting y generar
  await page.goto('/studio')
  await page.getByTestId('posting-select').selectOption({ label: 'Backend Developer' })
  await page.getByTestId('generate-btn').click()

  const frame = page.frameLocator('[data-testid="cv-preview-frame"] iframe')
  await expect(frame.locator('#experience')).toBeVisible({ timeout: 20_000 })

  // evaluar ATS → reporte con total y sugerencias
  await page.getByTestId('evaluate-btn').click()
  await expect(page.getByTestId('score-report')).toBeVisible({ timeout: 20_000 })
  const parentTotal = await page.getByTestId('score-total').textContent()
  expect(Number(parentTotal)).toBeGreaterThanOrEqual(0)
  await expect(page.getByTestId('top-suggestions')).toBeVisible()

  // iterar desde sugerencia #1 → hijo vinculado, auto-evaluado para comparar
  const [childEval] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/evaluate') && r.request().method() === 'POST',
      { timeout: 25_000 },
    ),
    page.getByTestId('iterate-btn').click(),
  ])
  expect(childEval.ok()).toBeTruthy()
  await expect(page.getByTestId('score-report')).toBeVisible({ timeout: 20_000 })

  // historial: el hijo recién creado está último con badge ATS; marcado como iteración
  await page.goto('/historial')
  const rows = page.locator('[data-testid^="cv-row-"]')
  await expect(rows.last()).toContainText('ATS', { timeout: 15_000 })
  await expect(rows.last()).toContainText('iteración')
})
