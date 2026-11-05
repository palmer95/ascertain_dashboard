import { useEffect, useEffectEvent, useId, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  bloodTypeValues,
  patientStatusValues,
  type PatientCreate,
  type PatientRead,
} from '@/api/schema'
import { FormError } from '@/components/FormError'
import { FormField } from '@/components/FormField'
import { TagInput } from '@/components/TagInput'
import { UnsavedChangesPrompt } from '@/components/UnsavedChangesPrompt'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms'

import {
  LIST_ITEM_MAX_LENGTH,
  MAX_LIST_ITEMS,
  MIN_DATE_OF_BIRTH,
  PATIENT_FORM_FIELDS,
  patientFormSchema,
  type PatientFormOutput,
  type PatientFormValues,
  toFormValues,
  toRequestBody,
  today,
} from '../form/schema'
import { US_STATES } from '../form/us-states'
import { PATIENT_STATUS_LABELS } from '../status'

const STATE_ITEMS = US_STATES.map(([code, name]) => ({ value: code, label: `${name} (${code})` }))
const BLOOD_TYPE_ITEMS = bloodTypeValues.map((type) => ({ value: type, label: type }))
const STATUS_ITEMS = patientStatusValues.map((status) => ({
  value: status,
  label: PATIENT_STATUS_LABELS[status],
}))

/**
 * Create and edit share this form. Fields are validated on the client first; whatever the
 * server still rejects (422) is shown on the same fields. If saving fails for any other
 * reason (offline, server error) the entered data stays, with a message and a retry.
 */
export function PatientForm({
  patient,
  submitLabel,
  cancelTo,
  onSubmit,
  onSaved,
}: {
  /** The patient being edited; omit to create one. */
  patient?: PatientRead
  submitLabel: string
  cancelTo: string
  onSubmit: (body: PatientCreate) => Promise<PatientRead>
  onSaved: (patient: PatientRead) => void
}) {
  const id = useId()
  const [formError, setFormError] = useState<unknown>(null)
  const [saved, setSaved] = useState<PatientRead | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PatientFormValues, unknown, PatientFormOutput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: toFormValues(patient),
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      setSaved(await onSubmit(toRequestBody(values)))
    } catch (error) {
      if (!applyServerErrors(error, setError, PATIENT_FORM_FIELDS)) setFormError(error)
    }
  })

  // Leave only after a render that knows the form is saved, so the unsaved-changes prompt
  // (rendered below, with its effects run first) doesn't block the navigation.
  const handleSaved = useEffectEvent(onSaved)
  useEffect(() => {
    if (saved) handleSaved(saved)
  }, [saved])

  const fieldId = (name: string) => `${id}-${name}`

  return (
    <form
      onSubmit={(event) => void submit(event)}
      noValidate
      // These are the patient's details, not the user's: keep the browser from autofilling
      // the clinician's own name and address.
      autoComplete="off"
      className="flex flex-col gap-6"
    >
      <FormSection title="Personal information">
        <FormField id={fieldId('first')} label="First name" error={errors.first_name?.message}>
          {(control) => <Input {...control} {...register('first_name')} />}
        </FormField>
        <FormField id={fieldId('last')} label="Last name" error={errors.last_name?.message}>
          {(control) => <Input {...control} {...register('last_name')} />}
        </FormField>
        <FormField id={fieldId('dob')} label="Date of birth" error={errors.date_of_birth?.message}>
          {(control) => (
            <Input
              {...control}
              type="date"
              min={MIN_DATE_OF_BIRTH}
              max={today()}
              {...register('date_of_birth')}
            />
          )}
        </FormField>
        <FormField id={fieldId('phone')} label="Phone" error={errors.phone?.message}>
          {(control) => (
            <Input {...control} type="tel" placeholder="(555) 123-4567" {...register('phone')} />
          )}
        </FormField>
        <FormField
          id={fieldId('email')}
          label="Email"
          optional
          error={errors.email?.message}
          className="md:col-span-2"
        >
          {(control) => <Input {...control} type="email" {...register('email')} />}
        </FormField>
        <FormField
          id={fieldId('address1')}
          label="Street address"
          error={errors.address_line1?.message}
          className="md:col-span-2"
        >
          {(control) => <Input {...control} {...register('address_line1')} />}
        </FormField>
        <FormField
          id={fieldId('address2')}
          label="Apartment, suite, etc."
          optional
          error={errors.address_line2?.message}
          className="md:col-span-2"
        >
          {(control) => <Input {...control} {...register('address_line2')} />}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr] md:col-span-2">
          <FormField id={fieldId('city')} label="City" error={errors.city?.message}>
            {(control) => <Input {...control} {...register('city')} />}
          </FormField>
          <FormField id={fieldId('state')} label="State" error={errors.state?.message}>
            {(fieldControl) => (
              <Controller
                control={control}
                name="state"
                render={({ field }) => (
                  <FormSelect
                    {...fieldControl}
                    items={STATE_ITEMS}
                    placeholder="Select a state"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    triggerRef={field.ref}
                  />
                )}
              />
            )}
          </FormField>
          <FormField id={fieldId('zip')} label="ZIP code" error={errors.postal_code?.message}>
            {(control) => <Input {...control} inputMode="numeric" {...register('postal_code')} />}
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Medical information">
        <FormField id={fieldId('blood')} label="Blood type" error={errors.blood_type?.message}>
          {(fieldControl) => (
            <Controller
              control={control}
              name="blood_type"
              render={({ field }) => (
                <FormSelect
                  {...fieldControl}
                  items={BLOOD_TYPE_ITEMS}
                  placeholder="Select a blood type"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  triggerRef={field.ref}
                />
              )}
            />
          )}
        </FormField>
        <FormField id={fieldId('status')} label="Status" error={errors.status?.message}>
          {(fieldControl) => (
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <FormSelect
                  {...fieldControl}
                  items={STATUS_ITEMS}
                  placeholder="Select a status"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  triggerRef={field.ref}
                />
              )}
            />
          )}
        </FormField>
        <FormField
          id={fieldId('allergies')}
          label="Allergies"
          optional
          hint="Press Enter after each allergy. Leave empty if there are no known allergies."
          error={listError(errors.allergies)}
          className="md:col-span-2"
        >
          {(fieldControl) => (
            <Controller
              control={control}
              name="allergies"
              render={({ field }) => (
                <TagInput
                  {...fieldControl}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  itemLabel="allergy"
                  placeholder="e.g. Penicillin"
                  maxItems={MAX_LIST_ITEMS}
                  maxLength={LIST_ITEM_MAX_LENGTH}
                  variant="destructive"
                />
              )}
            />
          )}
        </FormField>
        <FormField
          id={fieldId('conditions')}
          label="Conditions"
          optional
          hint="Press Enter after each condition."
          error={listError(errors.conditions)}
          className="md:col-span-2"
        >
          {(fieldControl) => (
            <Controller
              control={control}
              name="conditions"
              render={({ field }) => (
                <TagInput
                  {...fieldControl}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  itemLabel="condition"
                  placeholder="e.g. Hypertension"
                  maxItems={MAX_LIST_ITEMS}
                  maxLength={LIST_ITEM_MAX_LENGTH}
                />
              )}
            />
          )}
        </FormField>
      </FormSection>

      {formError !== null && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <FormError error={formError} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => void submit()}
          >
            Try again
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" render={<Link to={cancelTo} />} nativeButton={false}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || saved !== null}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>

      <UnsavedChangesPrompt when={isDirty && saved === null} />
    </form>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium">{title}</h2>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  )
}

/** A list's own error ("at most 50"), or the first item's ("each item must be…"). */
function listError(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('message' in error && typeof error.message === 'string') return error.message
  for (const item of Object.values(error)) {
    const message = listError(item)
    if (message) return message
  }
  return undefined
}

function FormSelect<T extends string>({
  items,
  placeholder,
  value,
  onChange,
  onBlur,
  triggerRef,
  ...control
}: {
  items: { value: T; label: string }[]
  placeholder: string
  value: T | undefined
  onChange: (value: T) => void
  onBlur: () => void
  triggerRef: (element: HTMLElement | null) => void
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}) {
  return (
    <Select
      items={items}
      value={value ?? null}
      onValueChange={(next) => {
        const item = items.find((candidate) => candidate.value === next)
        if (item) onChange(item.value)
      }}
      onOpenChange={(open) => !open && onBlur()}
    >
      <SelectTrigger ref={triggerRef} className="w-full" {...control}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
