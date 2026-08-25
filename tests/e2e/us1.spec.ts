import { expect, test } from '@playwright/test'

test('US1 smoke: onboarding → crear perfil → skill visible → persiste tras reload', async ({ page }) => {
  await page.goto('/')

  // según el estado de la base caemos en onboarding o directo al perfil
  const landing = page.getByTestId('profile-page').or(page.getByTestId('onboarding'))
  await expect(landing).toBeVisible()

  if (await page.getByTestId('onboarding').isVisible()) {
    const ob = page.getByTestId('onboarding')
    await ob.getByPlaceholder('Nombre del perfil').fill(`Dev QA ${Date.now()}`)
    await ob.locator('button').click()
  }

  // redirige al perfil
  const profilePage = page.getByTestId('profile-page')
  await expect(profilePage).toBeVisible({ timeout: 10_000 })

  // alta de skill con badge por categoría
  await page.getByLabel('Name').first().fill('TypeScript')
  await page.locator('form').first().locator('button').click()
  await expect(page.getByTestId('skill-badge-technical')).toContainText('TypeScript')

  // persistencia (FR-002): reload → sigue visible
  await page.reload()
  await expect(page.getByTestId('profile-page')).toBeVisible()
  await expect(page.getByTestId('skill-badge-technical')).toContainText('TypeScript')

  // switcher de perfil presente en layout (FR-024)
  await expect(page.getByTestId('profile-switcher')).toBeVisible()
})
