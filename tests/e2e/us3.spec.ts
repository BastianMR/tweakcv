import { expect, test } from '@playwright/test'

test('US3: pegar posting → generar CV → exportar 3 formatos', async ({ page }) => {
  // perfil activo (onboarding si la base está vacía)
  await page.goto('/')
  const landing = page.getByTestId('profile-page').or(page.getByTestId('onboarding'))
  await expect(landing).toBeVisible()
  if (await page.getByTestId('onboarding').isVisible()) {
    const ob = page.getByTestId('onboarding')
    await ob.getByPlaceholder('Nombre del perfil').fill(`Dev QA ${Date.now()}`)
    await ob.locator('button').click()
  }
  await expect(page.getByTestId('profile-page')).toBeVisible({ timeout: 10_000 })

  // materia prima para el CV: una experiencia con bullet
  const expSection = page.locator('section[data-section="Experiencia"]')
  await expSection.getByLabel('Company').fill('Acme Corp')
  await expSection.getByLabel('Role').fill('Backend Developer')
  await expSection.locator('form').locator('button').click()
  await expect(expSection.locator('li').first()).toContainText('Acme Corp', { timeout: 10_000 })

  // 1. crear postulación
  await page.goto('/postulaciones')
  await page.getByTestId('posting-text').fill(
    'Buscamos Backend Developer con TypeScript, Node.js y PostgreSQL. Requisitos: API REST.',
  )
  await page.getByTestId('parse-posting-btn').click()
  const postingCard = page.locator('[data-testid^="posting-"]').first()
  await expect(postingCard).toContainText('Backend Developer', { timeout: 15_000 })

  // 2. studio: seleccionar la postulación y generar
  await page.goto('/studio')
  await page.getByTestId('posting-select').selectOption({ label: 'Backend Developer' })
  await page.getByTestId('generate-btn').click()

  // preview iframe renderizado con headings canónicos ATS
  const frame = page.frameLocator('[data-testid="cv-preview-frame"] iframe')
  await expect(frame.locator('h1')).not.toHaveText('', { timeout: 20_000 })
  await expect(frame.locator('#experience')).toBeVisible()

  // 3. exportar pdf/md/json
  await page.getByTestId('export-btn').click()
  await expect(page.getByTestId('export-result')).toBeVisible({ timeout: 25_000 })

  // 4. historial lista el snapshot
  await page.goto('/historial')
  await expect(page.getByTestId('history-page')).toContainText('postulación')
})
