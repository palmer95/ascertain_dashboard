import type { NoteRead, PatientPage, PatientRead } from '@/api/schema'

export const PATIENT_ID = '01a1a4f0-2f81-7d1a-a15b-e39071c881c0'

export function makePatient(overrides: Partial<PatientRead> = {}): PatientRead {
  return {
    id: PATIENT_ID,
    first_name: 'Jane',
    last_name: 'Doe',
    date_of_birth: '1980-05-17',
    age: 46,
    email: 'jane.doe@example.com',
    phone: '(555) 123-4567',
    address_line1: '1 Main St',
    address_line2: null,
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    blood_type: 'O+',
    status: 'active',
    allergies: ['Penicillin'],
    conditions: ['Hypertension'],
    last_visit_at: '2026-10-01T09:00:00Z',
    created_at: '2026-01-01T09:00:00Z',
    updated_at: '2026-01-01T09:00:00Z',
    ...overrides,
  }
}

export function makeNote(overrides: Partial<NoteRead> = {}): NoteRead {
  return {
    id: '01a1a4f0-0000-7000-8000-000000000001',
    patient_id: PATIENT_ID,
    taken_at: '2026-03-02T09:00:00Z',
    content: 'Blood pressure stable.',
    created_at: '2026-03-02T09:05:00Z',
    ...overrides,
  }
}

export function makePage(items: PatientRead[], total = items.length): PatientPage {
  return { items, total, limit: 20, offset: 0 }
}

/** The error body the API sends for a 422. */
export function validationError(details: { field: string | null; msg: string }[]) {
  return {
    error: { code: 'validation_error', message: 'Request validation failed', details },
  }
}
