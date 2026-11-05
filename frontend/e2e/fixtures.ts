import { randomBytes } from 'node:crypto'

import { test as base, expect, type APIRequestContext } from '@playwright/test'

import type { PatientCreate, PatientRead } from '../src/api/schema'

/** A name no seeded or real patient has, so searches find only this test's patients. */
export function uniqueName(prefix = 'Zz') {
  return `${prefix}${randomBytes(4).toString('hex')}`
}

export function patientBody(overrides: Partial<PatientCreate> = {}): PatientCreate {
  return {
    first_name: 'Jane',
    last_name: uniqueName(),
    date_of_birth: '1980-05-17',
    email: null,
    phone: '(555) 123-4567',
    address_line1: '1 Main St',
    address_line2: null,
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    blood_type: 'O+',
    status: 'active',
    allergies: [],
    conditions: [],
    ...overrides,
  }
}

interface Patients {
  /** Create a patient through the API; it's deleted when the test ends. */
  create: (overrides?: Partial<PatientCreate>) => Promise<PatientRead>
  /** Delete this patient when the test ends (for ones created through the UI). */
  track: (id: string) => void
}

async function deletePatient(request: APIRequestContext, id: string) {
  const response = await request.delete(`/api/patients/${id}`)
  // 404 is fine: the test may already have deleted it through the UI.
  expect([204, 404]).toContain(response.status())
}

export const test = base.extend<{ patients: Patients }>({
  patients: async ({ request }, use) => {
    const ids: string[] = []
    await use({
      create: async (overrides) => {
        const response = await request.post('/api/patients', { data: patientBody(overrides) })
        expect(response.status()).toBe(201)
        const patient = (await response.json()) as PatientRead
        ids.push(patient.id)
        return patient
      },
      track: (id) => ids.push(id),
    })
    for (const id of ids) await deletePatient(request, id)
  },
})

export { expect }
