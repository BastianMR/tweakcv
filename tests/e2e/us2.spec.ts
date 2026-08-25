import { expect, test } from '@playwright/test'

test('US2: subir diploma → extracción mock → importar → visible en Perfil', async ({ page }) => {
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

  await page.goto('/documentos')

  // subida del fixture con kind explícito
  await page.getByLabel('Tipo (opcional)').selectOption('diploma')
  await page
    .getByTestId('file-input')
    .setInputFiles({
      name: 'diploma-uba.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('DIPLOMA UBA Ing. Informática 2015-03 a 2021-12 completed'),
    })
  await expect(page.getByTestId('document-table')).toBeVisible()

  // abrir slide-over: el botón Importar solo aparece cuando la extracción terminó
  const row = page.locator('[data-testid^="doc-row-"]').first()
  await row.click()
  await expect(page.getByTestId('slideover')).toBeVisible()
  await expect(page.getByTestId('open-import')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('open-import').click()
  await expect(page.getByTestId('diff-review')).toBeVisible()

  // aprobar el op propuesto (create en education)
  await page.locator('[data-testid="diff-review"] input[type=checkbox]').first().check()
  await page.getByTestId('import-confirm').click()

  // el documento queda imported
  await expect(row).toContainText('imported', { timeout: 10_000 })

  // visible en Perfil → sección Educación
  await page.goto('/perfil')
  const educationSection = page.locator('section[data-section="Educación"]')
  await expect(educationSection).toContainText('Universidad de Buenos Aires', { timeout: 10_000 })
})
