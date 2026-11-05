import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { makePage, makePatient } from '@/test/fixtures'
import { renderWithRouter } from '@/test/render'
import { apiUrl, server } from '@/test/server'

import PatientsPage from './PatientsPage'

/** Answers GET /patients with `total` matches, recording each request's query string. */
function fakeList(total = 2) {
  const queries: URLSearchParams[] = []
  server.use(
    http.get(apiUrl('/patients'), ({ request }) => {
      queries.push(new URL(request.url).searchParams)
      const items = total ? [makePatient(), makePatient({ id: 'p2', first_name: 'John' })] : []
      return HttpResponse.json(makePage(items, total))
    }),
  )
  return {
    all: () => queries.map((query) => Object.fromEntries(query)),
    last: () => queries.at(-1) ?? new URLSearchParams(),
  }
}

const renderPage = (path = '/patients') => renderWithRouter(<PatientsPage />, path)
const location = () => screen.getByTestId('location').textContent

async function openFilters(user: ReturnType<typeof renderPage>['user']) {
  await user.click(screen.getByRole('button', { name: /^Filters/ }))
  return screen.findByRole('dialog', { name: 'Filters' })
}

describe('PatientsPage', () => {
  it('requests the first page sorted by name, then prefetches the next', async () => {
    const api = fakeList(42)
    renderPage()

    expect(await screen.findByText('42 patients')).toBeVisible()
    const page = { sort: 'name', order: 'asc', limit: '20' }
    await waitFor(() =>
      expect(api.all()).toEqual([
        { ...page, offset: '0' },
        { ...page, offset: '20' }, // so "Next" is instant
      ]),
    )
  })

  it('searches by name once typing pauses', async () => {
    const api = fakeList()
    const { user } = renderPage()

    await user.type(await screen.findByRole('searchbox', { name: /Search patients/ }), 'jane')

    await waitFor(() => expect(location()).toBe('/patients?q=jane'))
    await waitFor(() => expect(api.last().get('q')).toBe('jane'))
  })

  it('applies filters from the panel to the URL and the request', async () => {
    const api = fakeList(7)
    const { user } = renderPage()
    await screen.findByText('7 patients')

    const panel = await openFilters(user)
    await user.click(within(panel).getByRole('checkbox', { name: 'Active' }))
    await user.click(within(panel).getByRole('checkbox', { name: 'Pending' }))
    await user.click(within(panel).getByRole('checkbox', { name: 'O-' }))
    await user.click(within(panel).getByRole('radio', { name: 'Never seen' }))
    await user.type(within(panel).getByLabelText('Condition'), 'diab')

    await waitFor(() =>
      expect(location()).toBe(
        '/patients?status=active&status=pending&blood_type=O-&condition=diab&last_visit=never',
      ),
    )
    await waitFor(() => expect(api.last().get('condition')).toBe('diab'))
    expect(api.last().getAll('status')).toEqual(['active', 'pending'])
    expect(api.last().get('blood_type')).toBe('O-')
    expect(api.last().get('last_visit')).toBe('never')
    expect(within(panel).getByRole('button', { name: 'Show 7 patients' })).toBeVisible()
  })

  it('applies an age range only when it makes sense', async () => {
    fakeList()
    const { user } = renderPage()
    const panel = await openFilters(user)
    const from = within(panel).getByLabelText('From')
    const to = within(panel).getByLabelText('To')

    await user.type(from, '50')
    await user.type(to, '40')
    expect(await within(panel).findByText('“From” must not be more than “To”')).toBeVisible()
    expect(to).toHaveAttribute('aria-invalid', 'true')

    await user.clear(to)
    await user.type(to, '60')
    await waitFor(() => expect(location()).toBe('/patients?min_age=50&max_age=60'))
  })

  it('shows filters from the URL as chips that remove one filter each', async () => {
    const api = fakeList()
    const { user } = renderPage('/patients?status=active&status=pending&min_age=30&max_age=30')

    expect(await screen.findByRole('button', { name: 'Filters, 2 in use' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Remove filter Status: Pending' }))
    expect(location()).toBe('/patients?status=active&min_age=30&max_age=30')

    await user.click(screen.getByRole('button', { name: 'Remove filter Age: 30' }))
    expect(location()).toBe('/patients?status=active')
    await waitFor(() => expect(api.last().get('min_age')).toBeNull())

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(location()).toBe('/patients')
  })

  it('ignores junk in the URL instead of failing', async () => {
    const api = fakeList()
    renderPage('/patients?status=bogus&status=active&page=abc&min_age=-3&sort=height')

    await screen.findByText('2 patients found')
    expect(api.last().getAll('status')).toEqual(['active'])
    expect(api.last().get('min_age')).toBeNull()
    expect(api.last().get('sort')).toBe('name')
    expect(api.last().get('offset')).toBe('0')
  })

  it('offers to clear filters when nothing matches', async () => {
    fakeList(0)
    const { user } = renderPage('/patients?q=zzz&blood_type=AB-')

    expect(await screen.findByText('No patients match your search.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(location()).toBe('/patients')
    expect(screen.getByRole('searchbox', { name: /Search patients/ })).toHaveValue('')
  })
})
