// Captura screenshots de las páginas principales para el README (T054)
import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const SHOTS = 'docs/screenshots'

test('capture screenshots', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true })

  await page.goto('/')
  const landing = page.getByTestId('profile-page').or(page.getByTestId('onboarding'))
  await expect(landing).toBeVisible()
  if (await page.getByTestId('onboarding').isVisible()) {
    const ob = page.getByTestId('onboarding')
    await ob.getByPlaceholder('Nombre del perfil').fill('Demo')
    await ob.locator('button').click()
  }
  await expect(page.getByTestId('profile-page')).toBeVisible({ timeout: 15_000 })

  // perfil con algo de contenido
  const exp = page.locator('section[data-section="Experiencia"]')
  if (!(await exp.locator('li').first().isVisible().catch(() => false))) {
    await exp.getByLabel('Company').fill('Acme Corp')
    await exp.getByLabel('Role').fill('Backend Developer')
    await exp.locator('form').locator('button').click()
    await expect(exp.locator('li').first()).toContainText('Acme Corp')
  }
  await page.screenshot({ path: `${SHOTS}/perfil.png`, fullPage: true })

  await page.goto('/documentos')
  await expect(page.getByTestId('documents-page')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/documentos.png`, fullPage: true })

  await page.goto('/postulaciones')
  await expect(page.getByTestId('postings-page')).toBeVisible()
  await page.getByTestId('posting-text').fill('Buscamos Backend Developer con TypeScript y PostgreSQL.')
  await page.getByTestId('parse-posting-btn').click()
  await expect(page.locator('[data-testid^="posting-"]').first()).toContainText('Backend Developer')
  await page.screenshot({ path: `${SHOTS}/postulaciones.png`, fullPage: true })

  await page.goto('/studio')
  await page.getByTestId('posting-select').selectOption({ label: 'Backend Developer' })
  await page.getByTestId('generate-btn').click()
  await expect(
    page.frameLocator('[data-testid="cv-preview-frame"] iframe').locator('#experience'),
  ).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${SHOTS}/studio.png`, fullPage: false })

  await page.goto('/historial')
  await expect(page.getByTestId('history-page')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/historial.png`, fullPage: true })

  await page.goto('/ajustes')
  await expect(page.getByTestId('settings-page')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/ajustes.png`, fullPage: true })
})
