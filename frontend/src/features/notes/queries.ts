import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { NoteCreate, NoteRead } from '@/api/schema'
import { patientKeys } from '@/features/patients/queries'
import { summaryKeys } from '@/features/summary/queries'

/** Matches the backend's limit on note content. */
export const NOTE_MAX_LENGTH = 5000

// Nested under the patient's detail key, so invalidating a patient refreshes its notes too.
export const noteKeys = {
  list: (patientId: string) => [...patientKeys.detail(patientId), 'notes'] as const,
}

export function notesQuery(patientId: string) {
  return queryOptions({
    queryKey: noteKeys.list(patientId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/patients/{patient_id}/notes', {
          params: { path: { patient_id: patientId } },
          signal,
        }),
      ),
  })
}

export function useNotes(patientId: string) {
  return useQuery(notesQuery(patientId))
}

/** Same order as the API: newest clinical time first. */
function newestFirst(a: NoteRead, b: NoteRead) {
  return b.taken_at.localeCompare(a.taken_at) || b.id.localeCompare(a.id)
}

/**
 * After a note is added or removed: the list is patched in place so the change shows at
 * once, then refetched to stay in step with the server. The summary is refetched because
 * its narrative is written from the notes. Neither is awaited, so the form or dialog
 * doesn't wait on a summary that may take seconds to generate.
 */
function useSyncNotes(patientId: string) {
  const queryClient = useQueryClient()
  return (update: (notes: NoteRead[]) => NoteRead[]) => {
    queryClient.setQueryData<NoteRead[]>(noteKeys.list(patientId), (notes) =>
      notes ? update(notes) : notes,
    )
    void queryClient.invalidateQueries({ queryKey: noteKeys.list(patientId) })
    void queryClient.invalidateQueries({ queryKey: summaryKeys.detail(patientId) })
  }
}

export function useCreateNote(patientId: string) {
  const syncNotes = useSyncNotes(patientId)
  return useMutation({
    mutationFn: (body: NoteCreate) =>
      unwrap(
        api.POST('/patients/{patient_id}/notes', {
          params: { path: { patient_id: patientId } },
          body,
        }),
      ),
    onSuccess: (note) => syncNotes((notes) => [note, ...notes].sort(newestFirst)),
  })
}

export function useDeleteNote(patientId: string) {
  const syncNotes = useSyncNotes(patientId)
  return useMutation({
    mutationFn: async (noteId: string) => {
      try {
        await unwrap(
          api.DELETE('/patients/{patient_id}/notes/{note_id}', {
            params: { path: { patient_id: patientId, note_id: noteId } },
          }),
        )
      } catch (error) {
        // Already gone (e.g. deleted in another tab): the outcome the user wanted.
        if (!(error instanceof ApiError && error.isNotFound)) throw error
      }
      return noteId
    },
    onSuccess: (noteId) => syncNotes((notes) => notes.filter((note) => note.id !== noteId)),
  })
}
