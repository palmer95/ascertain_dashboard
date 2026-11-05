import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { TagInput } from './TagInput'

function Harness({ initial = [], maxItems = 50 }: { initial?: string[]; maxItems?: number }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="allergies">Allergies</label>
      <TagInput
        id="allergies"
        value={value}
        onChange={setValue}
        itemLabel="allergy"
        maxItems={maxItems}
        maxLength={200}
      />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

function setup(props?: Parameters<typeof Harness>[0]) {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  const input = screen.getByLabelText('Allergies')
  const value = () => JSON.parse(screen.getByTestId('value').textContent ?? '[]') as string[]
  return { user, input, value }
}

describe('TagInput', () => {
  it('adds a value on Enter or comma, trimmed', async () => {
    const { user, input, value } = setup()

    await user.type(input, '  Penicillin {Enter}Latex,')

    expect(value()).toEqual(['Penicillin', 'Latex'])
    expect(input).toHaveValue('')
  })

  it('skips duplicates, ignoring case', async () => {
    const { user, input, value } = setup({ initial: ['Penicillin'] })

    await user.type(input, 'penicillin{Enter}')

    expect(value()).toEqual(['Penicillin'])
  })

  it('adds what was typed when the field loses focus', async () => {
    const { user, input, value } = setup()

    await user.type(input, 'Peanuts')
    await user.tab()

    expect(value()).toEqual(['Peanuts'])
  })

  it('removes the last value with Backspace in an empty field', async () => {
    const { user, input, value } = setup({ initial: ['Penicillin', 'Latex'] })

    await user.click(input)
    await user.keyboard('{Backspace}')

    expect(value()).toEqual(['Penicillin'])
  })

  it('removes a value with its remove button', async () => {
    const { user, value } = setup({ initial: ['Penicillin', 'Latex'] })

    await user.click(screen.getByRole('button', { name: 'Remove allergy Penicillin' }))

    expect(value()).toEqual(['Latex'])
  })

  it('stops adding at the limit', async () => {
    const { user, input, value } = setup({ initial: ['A', 'B'], maxItems: 2 })

    await user.type(input, 'C{Enter}')

    expect(value()).toEqual(['A', 'B'])
  })
})
