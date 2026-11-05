import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { NoteCreate, NoteRead } from '@/api/schema'
import { makeNote, PATIENT_ID } from '@/test/fixtures'
import { renderWithRouter } from '@/test/render'
import { apiUrl, server } from '@/test/server'

import { NotesSection } from './NotesSection'

const notesUrl = apiUrl(`/patients/${PATIENT_ID}/notes`)

/** A fake notes endpoint backed by an in-memory list, so writes show up on the next read. */
function fakeNotesApi(initial: NoteRead[] = []) {
  let notes = [...initial]
  const created: NoteCreate[] = []
  server.use(
    http.get(notesUrl, () => HttpResponse.json(notes)),
    http.post(notesUrl, async ({ request }) => {
      const body = (await request.json()) as NoteCreate
      created.push(body)
      const note = makeNote({ id: crypto.randomUUID(), ...body })
      notes = [note, ...notes]
      return HttpResponse.json(note, { status: 201 })
    }),
    http.delete(`${notesUrl}/:noteId`, ({ params }) => {
      notes = notes.filter((note) => note.id !== params.noteId)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return { created }
}

const renderNotes = () => renderWithRouter(<NotesSection patientId={PATIENT_ID} />)

describe('NotesSection', () => {
  it('lists the notes with a count', async () => {
    fakeNotesApi([
      makeNote({ id: 'a', content: 'Second visit.' }),
      makeNote({ id: 'b', content: 'First visit.' }),
    ])
    renderNotes()

    const items = await screen.findAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/visit/).textContent)).toEqual([
      'Second visit.',
      'First visit.',
    ])
    expect(screen.getByRole('heading', { name: 'Notes (2)' })).toBeVisible()
  })

  it('says when there are no notes yet', async () => {
    fakeNotesApi()
    renderNotes()

    expect(await screen.findByText('No notes yet.')).toBeVisible()
  })

  it('offers a retry when the notes fail to load', async () => {
    fakeNotesApi([makeNote({ content: 'Loaded on retry.' })])
    // The failing handler must win the first request, so register it last.
    server.use(http.get(notesUrl, () => HttpResponse.error(), { once: true }))
    const { user } = renderNotes()

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Loaded on retry.')).toBeVisible()
  })

  it('adds a note and returns focus to the Add button', async () => {
    const { created } = fakeNotesApi()
    const { user } = renderNotes()

    await user.click(await screen.findByRole('button', { name: 'Add note' }))
    const content = screen.getByLabelText('Note')
    expect(content).toHaveFocus()
    await user.type(content, 'BP 128/82 on lisinopril.')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText('BP 128/82 on lisinopril.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add note' })).toHaveFocus()
    expect(created).toHaveLength(1)
    expect(created[0]?.content).toBe('BP 128/82 on lisinopril.')
    // The local date and time from the form is sent as an absolute UTC timestamp.
    expect(created[0]?.taken_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/)
  })

  it('requires note text and shows the character count', async () => {
    fakeNotesApi()
    const { user } = renderNotes()

    await user.click(await screen.findByRole('button', { name: 'Add note' }))
    await user.type(screen.getByLabelText('Note'), '   ')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText('Write the note before saving')).toBeVisible()
    expect(screen.getByText('3 / 5,000')).toBeVisible()
  })

  it('rejects a time in the future', async () => {
    fakeNotesApi()
    const { user } = renderNotes()

    await user.click(await screen.findByRole('button', { name: 'Add note' }))
    await user.type(screen.getByLabelText('Note'), 'Follow-up.')
    const takenAt = screen.getByLabelText('Taken at')
    await user.clear(takenAt)
    await user.type(takenAt, '2999-01-01T09:00')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText("The time can't be in the future")).toBeVisible()
  })

  it('deletes a note only after confirming', async () => {
    fakeNotesApi([makeNote({ id: 'a', content: 'Remove me.' })])
    const { user } = renderNotes()

    await user.click(await screen.findByRole('button', { name: /^Delete note from/ }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this note?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Remove me.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^Delete note from/ }))
    await user.click(await screen.findByRole('button', { name: 'Delete note' }))

    expect(await screen.findByText('No notes yet.')).toBeVisible()
    // The deleted row's button is gone, so focus lands on the section heading, not the page.
    await waitFor(() => expect(screen.getByRole('heading', { name: /^Notes/ })).toHaveFocus())
  })
})
