import { expect, test } from './fixtures'

test('the dashboard links into the filtered patient list', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Patients by status' }).first()).toBeVisible()

  await page.getByRole('link', { name: /^Pending/ }).click()

  await expect(page).toHaveURL(/\/patients\?status=pending$/)
  await expect(page.getByRole('button', { name: 'Remove filter Status: Pending' })).toBeVisible()
})

test('the chosen theme is applied and remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)

  await page.getByRole('button', { name: /^Theme/ }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect(html).toHaveClass(/dark/)

  await page.reload()
  await expect(html).toHaveClass(/dark/)
})

test('unknown pages and patients say so', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()

  await page.goto('/patients/01a1a4f0-0000-7000-8000-000000000000')
  await expect(page.getByText('Patient not found')).toBeVisible()
})
