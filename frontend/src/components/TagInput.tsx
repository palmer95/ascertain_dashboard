import { useState, type KeyboardEvent, type Ref } from 'react'
import { X } from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'

/**
 * A list of short values (allergies, conditions) typed one at a time. Enter or comma adds the
 * typed value, Backspace in an empty input removes the last one, and leaving the field adds
 * whatever was typed, so a value isn't lost if the user clicks Save without pressing Enter.
 * Duplicates (ignoring case) are skipped, as the server would drop them anyway.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  inputRef,
  itemLabel,
  placeholder,
  maxItems,
  maxLength,
  variant = 'secondary',
  ...aria
}: {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement>
  /** Names one item in remove-button labels, e.g. "allergy". */
  itemLabel: string
  placeholder?: string
  maxItems: number
  maxLength: number
  variant?: 'secondary' | 'destructive'
  'aria-invalid'?: true
  'aria-describedby'?: string
}) {
  const [draft, setDraft] = useState('')
  const isFull = value.length >= maxItems

  function commit() {
    const text = draft.trim()
    setDraft('')
    if (!text || isFull) return
    if (value.some((item) => item.toLowerCase() === text.toLowerCase())) return
    onChange([...value, text])
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault() // Enter would otherwise submit the form
      commit()
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        aria['aria-invalid'] &&
          'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
      )}
    >
      {value.length > 0 && (
        <ul className="contents">
          {value.map((item) => (
            <li key={item}>
              <Badge variant={variant} className="gap-0.5 pr-0.5">
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${itemLabel} ${item}`}
                  className="rounded-sm p-0.5 opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => onChange(value.filter((other) => other !== item))}
                >
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit()
          onBlur?.()
        }}
        disabled={isFull}
        placeholder={isFull ? `Limit of ${maxItems} reached` : placeholder}
        maxLength={maxLength}
        autoComplete="off"
        className="h-6 min-w-32 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
        {...aria}
      />
    </div>
  )
}
