import { useId, useState, type ReactNode } from 'react'
import { CheckboxGroup } from '@base-ui/react/checkbox-group'
import { SlidersHorizontal } from 'lucide-react'

import { bloodTypeValues, lastVisitValues, patientStatusValues } from '@/api/schema'
import { DebouncedInput } from '@/components/DebouncedInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { cn } from '@/lib/utils'

import { LAST_VISIT_LABELS, STATE_NAMES } from '../filters'
import { US_STATES } from '../form/us-states'
import {
  countPanelFilters,
  FILTER_TEXT_MAX_LENGTH,
  MAX_AGE,
  NO_PANEL_FILTERS,
  type PatientListParams,
} from '../list-params'
import { PATIENT_STATUS_LABELS } from '../status'

type OnChange = (updates: Partial<PatientListParams>, options?: { replace?: boolean }) => void

const ANY_TIME = 'any'
const STATE_ITEMS = US_STATES.map(([code, name]) => ({ value: code, label: name }))

/**
 * Advanced search. Every control applies straight away (the list updates behind the panel)
 * and is kept in the URL; typed values wait for a pause, like the name search.
 */
export function PatientFiltersPanel({
  params,
  onChange,
  total,
  isUpdating,
}: {
  params: PatientListParams
  onChange: OnChange
  /** Matches for the current filters, shown on the button that closes the panel. */
  total: number | undefined
  isUpdating: boolean
}) {
  const activeCount = countPanelFilters(params)
  // Typing replaces the history entry, so Back doesn't step through every keystroke.
  const typed = (updates: Partial<PatientListParams>) => onChange(updates, { replace: true })

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            aria-label={activeCount ? `Filters, ${activeCount} in use` : 'Filters'}
          />
        }
      >
        <SlidersHorizontal aria-hidden data-icon="inline-start" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent className="gap-0">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Results update as you choose.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          <FilterGroup legend="Status">
            {(labelId) => (
              <CheckboxList
                labelId={labelId}
                options={patientStatusValues.map((status) => ({
                  value: status,
                  label: PATIENT_STATUS_LABELS[status],
                }))}
                value={params.status}
                onChange={(status) => onChange({ status })}
                className="grid-cols-2"
              />
            )}
          </FilterGroup>

          <FilterGroup legend="Blood type">
            {(labelId) => (
              <CheckboxList
                labelId={labelId}
                options={bloodTypeValues.map((type) => ({ value: type, label: type }))}
                value={params.blood_type}
                onChange={(blood_type) => onChange({ blood_type })}
                className="grid-cols-4"
              />
            )}
          </FilterGroup>

          <AgeRangeFilter min={params.min_age} max={params.max_age} onChange={typed} />

          <FilterGroup legend="Last visit">
            {(labelId) => (
              <RadioGroup
                aria-labelledby={labelId}
                value={params.last_visit ?? ANY_TIME}
                onValueChange={(next) =>
                  onChange({ last_visit: lastVisitValues.find((preset) => preset === next) })
                }
              >
                {[
                  { value: ANY_TIME, label: 'Any time' },
                  ...lastVisitValues.map((preset) => ({
                    value: preset,
                    label: LAST_VISIT_LABELS[preset],
                  })),
                ].map((option) => (
                  <Label key={option.value} className="font-normal">
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </Label>
                ))}
              </RadioGroup>
            )}
          </FilterGroup>

          <TextFilter
            label="Condition"
            placeholder="e.g. diabetes"
            value={params.condition}
            onChange={(condition) => typed({ condition })}
          />
          <TextFilter
            label="Allergy"
            placeholder="e.g. penicillin"
            value={params.allergy}
            onChange={(allergy) => typed({ allergy })}
          />

          <StateFilter value={params.state} onChange={(state) => onChange({ state })} />
        </div>

        <SheetFooter className="flex-row border-t">
          <Button
            variant="outline"
            className="flex-1"
            disabled={activeCount === 0}
            onClick={() => onChange(NO_PANEL_FILTERS)}
          >
            Clear filters
          </Button>
          <SheetClose render={<Button className="flex-1" />}>
            {total === undefined || isUpdating
              ? 'Show results'
              : total === 0
                ? 'No matches'
                : `Show ${total} ${total === 1 ? 'patient' : 'patients'}`}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** A labelled group; the legend's id is passed down for the control's aria-labelledby. */
function FilterGroup({
  legend,
  children,
}: {
  legend: string
  children: (labelId: string) => ReactNode
}) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2.5">
      <h3 id={id} className="text-sm font-medium">
        {legend}
      </h3>
      {children(id)}
    </div>
  )
}

function CheckboxList<T extends string>({
  labelId,
  options,
  value,
  onChange,
  className,
}: {
  labelId: string
  options: { value: T; label: string }[]
  value: T[]
  onChange: (value: T[]) => void
  className?: string
}) {
  return (
    <CheckboxGroup
      aria-labelledby={labelId}
      value={value}
      // Keep the options' order, whatever order they were ticked in.
      onValueChange={(next) =>
        onChange(options.flatMap((o) => (next.includes(o.value) ? [o.value] : [])))
      }
      className={cn('grid gap-2.5', className)}
    >
      {options.map((option) => (
        <Label key={option.value} className="font-normal">
          <Checkbox value={option.value} />
          {option.label}
        </Label>
      ))}
    </CheckboxGroup>
  )
}

function TextFilter({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <DebouncedInput
        id={id}
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        maxLength={FILTER_TEXT_MAX_LENGTH}
        value={value}
        onCommit={onChange}
      />
    </div>
  )
}

const AGE_PATTERN = /^\d{1,3}$/

/** "" is no limit; anything else must be a whole number of years in range. */
function parseAge(text: string): number | undefined | null {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  const age = Number(trimmed)
  return AGE_PATTERN.test(trimmed) && age <= MAX_AGE ? age : null
}

const showAge = (age: number | undefined) => (age === undefined ? '' : String(age))

/** From/to ages; the same number in both finds one exact age. */
function AgeRangeFilter({
  min,
  max,
  onChange,
}: {
  min: number | undefined
  max: number | undefined
  onChange: (updates: Pick<PatientListParams, 'min_age' | 'max_age'>) => void
}) {
  const id = useId()
  const [from, setFrom] = useState(showAge(min))
  const [to, setTo] = useState(showAge(max))
  const commit = useDebouncedCallback(onChange, 400)

  // The range changed from outside (a removed chip, "Clear filters", Back): show it, unless
  // the boxes already say the same thing.
  const [synced, setSynced] = useState({ min, max })
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max })
    if (parseAge(from) !== min) setFrom(showAge(min))
    if (parseAge(to) !== max) setTo(showAge(max))
  }

  const fromAge = parseAge(from)
  const toAge = parseAge(to)
  const error =
    fromAge === null || toAge === null
      ? `Enter whole years from 0 to ${MAX_AGE}`
      : fromAge !== undefined && toAge !== undefined && fromAge > toAge
        ? '“From” must not be more than “To”'
        : undefined

  function update(nextFrom: string, nextTo: string) {
    setFrom(nextFrom)
    setTo(nextTo)
    const min_age = parseAge(nextFrom)
    const max_age = parseAge(nextTo)
    const valid =
      min_age !== null &&
      max_age !== null &&
      (min_age === undefined || max_age === undefined || min_age <= max_age)
    if (valid) commit.call({ min_age, max_age })
  }

  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hintId

  return (
    <FilterGroup legend="Age">
      {() => (
        <>
          <div className="flex items-end gap-2">
            {(['from', 'to'] as const).map((end) => (
              <div key={end} className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`${id}-${end}`} className="text-xs text-muted-foreground">
                  {end === 'from' ? 'From' : 'To'}
                </Label>
                <Input
                  id={`${id}-${end}`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={end === 'from' ? '0' : String(MAX_AGE)}
                  maxLength={3}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                  value={end === 'from' ? from : to}
                  onChange={(event) =>
                    end === 'from'
                      ? update(event.target.value, to)
                      : update(from, event.target.value)
                  }
                  onBlur={commit.flush}
                  onKeyDown={(event) => event.key === 'Enter' && commit.flush()}
                />
              </div>
            ))}
          </div>
          {error ? (
            <p id={errorId} className="text-xs text-destructive">
              {error}
            </p>
          ) : (
            <p id={hintId} className="text-xs text-muted-foreground">
              Use the same age in both for an exact age.
            </p>
          )}
        </>
      )}
    </FilterGroup>
  )
}

function StateFilter({
  value,
  onChange,
}: {
  value: PatientListParams['state']
  onChange: (value: PatientListParams['state']) => void
}) {
  const id = useId()
  const anchor = useComboboxAnchor()
  const selected = STATE_ITEMS.filter((item) => value.includes(item.value))

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>State</Label>
      <Combobox
        multiple
        autoHighlight
        items={STATE_ITEMS}
        value={selected}
        onValueChange={(items, details) => {
          // By default Escape (with the list closed) clears every pick. Here Escape should
          // close the panel, as it does from any other filter, so keep the picks.
          if (details.reason === 'escape-key') {
            details.allowPropagation()
            return
          }
          // Keep the table's order, whatever order they were picked in.
          onChange(STATE_ITEMS.flatMap((item) => (items.includes(item) ? [item.value] : [])))
        }}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(items: typeof STATE_ITEMS) => (
              <>
                {items.map((item) => (
                  <ComboboxChip key={item.value} aria-label={STATE_NAMES[item.value]}>
                    {item.value}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  placeholder={items.length ? undefined : 'Search states…'}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No matching states.</ComboboxEmpty>
          <ComboboxList>
            {(item: (typeof STATE_ITEMS)[number]) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
                <span className="text-muted-foreground">{item.value}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
