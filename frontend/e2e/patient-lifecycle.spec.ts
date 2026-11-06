import { expect, test, uniqueName } from './fixtures'

test('register a patient, add a note, see the summary, edit and delete them', async ({
  page,
  patients,
}) => {
  const lastName = uniqueName()

  // Register
  await page.goto('/patients')
  await page.getByRole('button', { name: 'New patient' }).click()
  await expect(page.getByRole('heading', { name: 'New patient' })).toBeVisible()

  await page.getByLabel('First name').fill('Jane')
  await page.getByLabel('Last name').fill(lastName)
  await page.getByLabel('Date of birth').fill('1980-05-17')
  await page.getByLabel('Phone').fill('(555) 123-4567')
  await page.getByLabel('Street address').fill('1 Main St')
  await page.getByLabel('City').fill('Springfield')
  await page.getByRole('combobox', { name: 'State' }).click()
  await page.getByRole('option', { name: 'Illinois (IL)' }).click()
  await page.getByLabel('ZIP code').fill('62701')
  await page.getByRole('combobox', { name: 'Blood type' }).click()
  await page.getByRole('option', { name: 'A+', exact: true }).click()
  await page.getByLabel(/^Allergies/).fill('Penicillin')
  await page.getByLabel(/^Allergies/).press('Enter')
  await page.getByRole('button', { name: 'Create patient' }).click()

  // Lands on the new record
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}$/)
  patients.track(page.url().split('/').at(-1) ?? '')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(lastName)
  await expect(page.getByText('Penicillin').first()).toBeVisible()
  await expect(page.getByText('No visits yet')).toBeVisible()

  // Add a note
  await page.getByRole('button', { name: 'Add note' }).click()
  await page
    .getByRole('textbox', { name: 'Note', exact: true })
    .fill('Initial visit. BP 150/95, starting lisinopril.')
  await page.getByRole('button', { name: 'Save note' }).click()
  // Scoped to the notes section: the template summary quotes the latest note too.
  const notes = page.getByRole('region', { name: /^Notes/ })
  await expect(notes.getByText('Initial visit. BP 150/95, starting lisinopril.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Notes (1)' })).toBeVisible()
  // The note is the patient's first visit
  await expect(page.getByText(/Last visit [A-Z][a-z]{2} \d{1,2}, \d{4}/)).toBeVisible()

  // The summary picks up the note (written by the model if a key is set, else the template)
  await expect(page.getByText(/^(AI-generated|Template)$/)).toBeVisible()
  await expect(page.getByText(/1 clinical note|from 1 note/i).first()).toBeVisible()

  // Edit
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const phone = page.getByLabel('Phone')
  await expect(phone).toHaveValue('(555) 123-4567')
  await phone.fill('(555) 987-6543')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}$/)
  await expect(page.getByText('(555) 987-6543')).toBeVisible()

  // Delete, after confirming
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete patient' }).click()
  await expect(page).toHaveURL(/\/patients$/)

  await page.getByRole('searchbox', { name: /Search patients/ }).fill(lastName)
  await expect(page.getByText('No patients match your search.')).toBeVisible()
})
