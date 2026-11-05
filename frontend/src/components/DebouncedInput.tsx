import { useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'

const DEBOUNCE_MS = 300

/**
 * A text input that never blocks typing: it owns its text and reports the trimmed value once
 * typing pauses. Enter or leaving the field reports it immediately.
 */
export function DebouncedInput({
  value,
  onCommit,
  onKeyDown,
  onBlur,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState(value)
  const commit = useDebouncedCallback(onCommit, DEBOUNCE_MS)

  // The value changed from outside (Back, "Clear filters"): show it. Adjusting state while
  // rendering is React's recommended pattern for this. Comparing against the trimmed text means
  // our own debounced write never clobbers what the user is still typing (e.g. a trailing space).
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (value !== text.trim()) setText(value)
  }

  return (
    <Input
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        commit.call(event.target.value.trim())
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit.flush()
        onKeyDown?.(event)
      }}
      onBlur={(event) => {
        commit.flush()
        onBlur?.(event)
      }}
    />
  )
}
