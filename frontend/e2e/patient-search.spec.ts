import { expect, test, uniqueName } from './fixtures'

test('find patients by name and narrow them with filters', async ({ page, patients }) => {
  const lastName = uniqueName()
  await patients.create({ first_name: 'Olivia', last_name: lastName, blood_type: 'O-' })
  await patients.create({ first_name: 'Arthur', last_name: lastName, blood_type: 'AB+' })

  await page.goto('/patients')
  await page.getByRole('searchbox', { name: /Search patients/ }).fill(lastName)

  const results = page.getByRole('table')
  await expect(page).toHaveURL(new RegExp(`q=${lastName}`))
  await expect(page.getByText('2 patients found')).toBeVisible()
  await expect(results.getByRole('link', { name: `${lastName}, Olivia` })).toBeVisible()
  await expect(results.getByRole('link', { name: `${lastName}, Arthur` })).toBeVisible()

  // Narrow by blood type in the filters panel
  await page.getByRole('button', { name: 'Filters' }).click()
  const panel = page.getByRole('dialog', { name: 'Filters' })
  await panel.getByRole('checkbox', { name: 'O-' }).click()
  await expect(panel.getByRole('button', { name: 'Show 1 patient' })).toBeVisible()
  await panel.getByRole('button', { name: 'Show 1 patient' }).click()

  await expect(page.getByText('1 patient found')).toBeVisible()
  await expect(results.getByRole('link', { name: `${lastName}, Arthur` })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Remove filter Blood type: O-' })).toBeVisible()

  // The search and filter live in the URL, so they survive a reload
  await page.reload()
  await expect(page.getByText('1 patient found')).toBeVisible()
  await expect(page.getByRole('searchbox', { name: /Search patients/ })).toHaveValue(lastName)

  // Removing the chip brings the other patient back
  await page.getByRole('button', { name: 'Remove filter Blood type: O-' }).click()
  await expect(page.getByText('2 patients found')).toBeVisible()

  // A row opens the patient's record
  await results.getByRole('link', { name: `${lastName}, Olivia` }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Olivia ${lastName}`)
})
