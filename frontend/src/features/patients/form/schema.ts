import type { DefaultValues } from 'react-hook-form'
import { z } from 'zod'

import {
  bloodTypeValues,
  patientStatusValues,
  type PatientCreate,
  type PatientRead,
} from '@/api/schema'
import { toDateTimeLocalValue } from '@/lib/format'

import { US_STATE_CODES } from './us-states'

/*
 * Client-side rules mirror the backend's `PatientWrite` schema, so most mistakes are caught
 * before a request is sent. The server stays the authority: anything it still rejects comes
 * back as a 422 and is shown on the same fields (field names match the API's).
 */

export const MIN_DATE_OF_BIRTH = '1900-01-01'
export const MAX_LIST_ITEMS = 50
export const LIST_ITEM_MAX_LENGTH = 200

const PHONE_CHARS = /^\+?[0-9\s().-]+$/
const POSTAL_CODE = /^[0-9]{5}(-[0-9]{4})?$/
const emailSchema = z.email()

/** Today as "YYYY-MM-DD" in the user's time zone (a date of birth is a calendar date). */
export function today() {
  return toDateTimeLocalValue(new Date()).slice(0, 10)
}

function requiredText(label: string, max: number) {
  return z.string().trim().min(1, `Enter ${label}`).max(max, `Use ${max} characters or fewer`)
}

function clinicalList(label: string) {
  return z
    .array(
      z
        .string()
        .max(LIST_ITEM_MAX_LENGTH, `Each item must be ${LIST_ITEM_MAX_LENGTH} characters or fewer`),
    )
    .max(MAX_LIST_ITEMS, `Add at most ${MAX_LIST_ITEMS} ${label}`)
}

export const patientFormSchema = z.object({
  first_name: requiredText('a first name', 100),
  last_name: requiredText('a last name', 100),
  date_of_birth: z
    .string()
    .min(1, 'Enter a date of birth')
    // "YYYY-MM-DD" strings compare correctly as text, and stay calendar dates (no time zone).
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date')
    .refine((value) => value <= today(), "Date of birth can't be in the future")
    .refine((value) => value >= MIN_DATE_OF_BIRTH, 'Date of birth must be in 1900 or later'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter a phone number')
    .max(32, 'Enter a valid phone number, e.g. (555) 123-4567')
    .refine((value) => {
      const digits = value.replace(/\D/g, '').length
      return PHONE_CHARS.test(value) && digits >= 10 && digits <= 15
    }, 'Enter a valid phone number, e.g. (555) 123-4567'),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || emailSchema.safeParse(value).success,
      'Enter a valid email address',
    ),
  address_line1: requiredText('a street address', 200),
  address_line2: z.string().trim().max(200, 'Use 200 characters or fewer'),
  city: requiredText('a city', 100),
  state: z.enum(US_STATE_CODES, { error: 'Select a state' }),
  postal_code: z
    .string()
    .trim()
    .min(1, 'Enter a ZIP code')
    .regex(POSTAL_CODE, 'Use 12345 or 12345-6789'),
  blood_type: z.enum(bloodTypeValues, { error: 'Select a blood type' }),
  status: z.enum(patientStatusValues, { error: 'Select a status' }),
  allergies: clinicalList('allergies'),
  conditions: clinicalList('conditions'),
})

export type PatientFormValues = z.input<typeof patientFormSchema>
export type PatientFormOutput = z.output<typeof patientFormSchema>

export const PATIENT_FORM_FIELDS = Object.keys(
  patientFormSchema.shape,
) as (keyof PatientFormValues)[]

/** Selects start empty (`undefined`) on a new patient, so a blood type is a deliberate pick. */
export function toFormValues(patient?: PatientRead): DefaultValues<PatientFormValues> {
  if (!patient) {
    return {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone: '',
      email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: undefined,
      postal_code: '',
      blood_type: undefined,
      // A newly registered patient hasn't been seen yet, which is what "pending" means here.
      status: 'pending',
      allergies: [],
      conditions: [],
    }
  }
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    phone: patient.phone,
    email: patient.email ?? '',
    address_line1: patient.address_line1,
    address_line2: patient.address_line2 ?? '',
    city: patient.city,
    // A plain string in the API; an unknown code leaves the select empty instead of invalid.
    state: US_STATE_CODES.find((code) => code === patient.state),
    postal_code: patient.postal_code,
    blood_type: patient.blood_type,
    status: patient.status,
    allergies: patient.allergies,
    conditions: patient.conditions,
  }
}

/** The request body: optional text left blank is sent as null, not "". */
export function toRequestBody(values: PatientFormOutput): PatientCreate {
  return {
    ...values,
    email: values.email || null,
    address_line2: values.address_line2 || null,
  }
}
