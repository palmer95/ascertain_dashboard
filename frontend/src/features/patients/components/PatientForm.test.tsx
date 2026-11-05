import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { PatientCreate } from '@/api/schema'
import PatientCreatePage from '@/pages/PatientCreatePage'
import PatientEditPage from '@/pages/PatientEditPage'
import { makePatient, PATIENT_ID, validationError } from '@/test/fixtures'
import { LocationDisplay, renderRoutes } from '@/test/render'
import { apiUrl, server } from '@/test/server'

const routes = [
  { path: '/patients/new', element: <PatientCreatePage /> },
  { path: '/patients/:patientId/edit', element: <PatientEditPage /> },
  {
    path: '*',
    element: (
      <>
        <h1>Somewhere else</h1>
        <LocationDisplay />
      </>
    ),
  },
]

async function pick(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function fillRequiredFields(user: UserEvent) {
  await user.type(screen.getByLabelText('First name'), 'Jane')
  await user.type(screen.getByLabelText('Last name'), 'Doe')
  await user.type(screen.getByLabelText('Date of birth'), '1980-05-17')
  await user.type(screen.getByLabelText('Phone'), '(555) 123-4567')
  await user.type(screen.getByLabelText('Street address'), '1 Main St')
  await user.type(screen.getByLabelText('City'), 'Springfield')
  await pick(user, 'State', 'Illinois (IL)')
  await user.type(screen.getByLabelText('ZIP code'), '62701')
  await pick(user, 'Blood type', 'O+')
}

/** Answers POST /patients, recording each body it receives. */
function acceptCreate() {
  const bodies: PatientCreate[] = []
  server.use(
    http.post(apiUrl('/patients'), async ({ request }) => {
      const body = (await request.json()) as PatientCreate
      bodies.push(body)
      return HttpResponse.json(makePatient({ ...body, id: PATIENT_ID }), { status: 201 })
    }),
  )
  return bodies
}

const createButton = () => screen.getByRole('button', { name: 'Create patient' })
const field = (label: string | RegExp) => screen.getByLabelText(label)
const select = (label: string) => screen.getByRole('combobox', { name: label })

/** The messages announced with a field (its aria-describedby), as a screen reader hears them. */
function describedBy(element: HTMLElement) {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
}

describe('creating a patient', () => {
  it('shows every missing field and focuses the first, without sending anything', async () => {
    const { user } = renderRoutes(routes, '/patients/new')

    await user.click(createButton())

    await waitFor(() => expect(describedBy(field('First name'))).toBe('Enter a first name'))
    expect(describedBy(field('Last name'))).toBe('Enter a last name')
    expect(describedBy(field('Date of birth'))).toBe('Enter a date of birth')
    expect(describedBy(field('Phone'))).toBe('Enter a phone number')
    expect(describedBy(field('Street address'))).toBe('Enter a street address')
    expect(describedBy(field('City'))).toBe('Enter a city')
    expect(describedBy(select('State'))).toBe('Select a state')
    expect(describedBy(field('ZIP code'))).toBe('Enter a ZIP code')
    expect(describedBy(select('Blood type'))).toBe('Select a blood type')
    expect(screen.getByLabelText('First name')).toHaveFocus()
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true')
    // No handler is registered: any request would have failed the test.
  })

  it('validates formats on the client', async () => {
    const { user } = renderRoutes(routes, '/patients/new')

    await user.type(screen.getByLabelText('Phone'), '12345')
    await user.type(field(/^Email/), 'not-an-email')
    await user.type(screen.getByLabelText('ZIP code'), '1234')
    await user.click(createButton())

    expect(await screen.findByText('Enter a valid phone number, e.g. (555) 123-4567')).toBeVisible()
    expect(screen.getByText('Enter a valid email address')).toBeVisible()
    expect(screen.getByText('Use 12345 or 12345-6789')).toBeVisible()
  })

  it('sends a clean body and opens the new patient', async () => {
    const bodies = acceptCreate()
    const { user } = renderRoutes(routes, '/patients/new')

    await fillRequiredFields(user)
    await user.type(field(/^Allergies/), 'Penicillin{Enter}')
    await user.click(createButton())

    expect(await screen.findByTestId('location')).toHaveTextContent(`/patients/${PATIENT_ID}`)
    expect(bodies).toEqual([
      {
        first_name: 'Jane',
        last_name: 'Doe',
        date_of_birth: '1980-05-17',
        phone: '(555) 123-4567',
        email: null, // left blank: sent as null, not ""
        address_line1: '1 Main St',
        address_line2: null,
        city: 'Springfield',
        state: 'IL',
        postal_code: '62701',
        blood_type: 'O+',
        status: 'pending', // a new patient defaults to pending
        allergies: ['Penicillin'],
        conditions: [],
      },
    ])
  })

  it('shows what the server rejects on the field it belongs to', async () => {
    server.use(
      http.post(apiUrl('/patients'), () =>
        HttpResponse.json(
          validationError([{ field: 'email', msg: 'This email domain does not exist' }]),
          { status: 422 },
        ),
      ),
    )
    const { user } = renderRoutes(routes, '/patients/new')

    await fillRequiredFields(user)
    await user.type(field(/^Email/), 'jane@nowhere.example')
    await user.click(createButton())

    expect(await screen.findByText('This email domain does not exist')).toBeVisible()
    expect(field(/^Email/)).toHaveAttribute('aria-invalid', 'true')
    expect(field(/^Email/)).toHaveFocus()
    expect(screen.getByLabelText('First name')).toHaveValue('Jane') // nothing was lost
  })

  it('keeps the data after a network failure and saves on retry', async () => {
    const bodies = acceptCreate()
    // Added last, so it's tried first (once): the first save fails, the retry succeeds.
    server.use(http.post(apiUrl('/patients'), () => HttpResponse.error(), { once: true }))
    const { user } = renderRoutes(routes, '/patients/new')

    await fillRequiredFields(user)
    await user.click(createButton())

    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByTestId('location')).toHaveTextContent(`/patients/${PATIENT_ID}`)
    expect(bodies).toHaveLength(1)
  })

  it('asks before throwing away unsaved changes', async () => {
    const { user } = renderRoutes(routes, '/patients/new')
    await user.type(screen.getByLabelText('First name'), 'Jane')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard unsaved changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('First name')).toHaveValue('Jane')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/patients')
  })
})

describe('editing a patient', () => {
  it('starts from the saved record and sends the full replacement', async () => {
    const saved = makePatient({ email: null, conditions: ['Asthma'] })
    let body: PatientCreate | undefined
    server.use(
      http.get(apiUrl(`/patients/${PATIENT_ID}`), () => HttpResponse.json(saved)),
      http.put(apiUrl(`/patients/${PATIENT_ID}`), async ({ request }) => {
        body = (await request.json()) as PatientCreate
        return HttpResponse.json({ ...saved, ...body })
      }),
    )
    const { user } = renderRoutes(routes, `/patients/${PATIENT_ID}/edit`)

    const phone = await screen.findByLabelText('Phone')
    expect(screen.getByLabelText('First name')).toHaveValue('Jane')
    expect(screen.getByRole('combobox', { name: 'State' })).toHaveTextContent('Illinois (IL)')
    await user.clear(phone)
    await user.type(phone, '(555) 987-6543')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByTestId('location')).toHaveTextContent(`/patients/${PATIENT_ID}`)
    expect(body).toMatchObject({
      first_name: 'Jane',
      phone: '(555) 987-6543',
      email: null,
      conditions: ['Asthma'],
      status: 'active',
    })
  })

  it('says so when the patient no longer exists', async () => {
    server.use(
      http.get(apiUrl(`/patients/${PATIENT_ID}`), () =>
        HttpResponse.json(
          { error: { code: 'not_found', message: 'Patient not found', details: [] } },
          { status: 404 },
        ),
      ),
    )
    renderRoutes(routes, `/patients/${PATIENT_ID}/edit`)

    expect(await screen.findByText('Patient not found')).toBeVisible()
  })
})
