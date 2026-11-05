import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/layout/AppLayout'
import { RootErrorBoundary, RouteErrorBoundary } from '@/components/RouteErrorBoundary'

import type { RouteHandle } from './route-handle'

/** Code-split a page: its chunk loads on first navigation to the route. */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default })
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    // Only if the shell itself fails; page errors are caught below, inside the shell.
    ErrorBoundary: RootErrorBoundary,
    hydrateFallbackElement: null,
    children: [
      {
        // Pathless wrapper: a page that throws (or fails to load) shows an error in place of
        // the page while the sidebar and header keep working.
        ErrorBoundary: RouteErrorBoundary,
        children: [
          {
            index: true,
            handle: { crumb: 'Dashboard' } satisfies RouteHandle,
            lazy: lazyPage(() => import('@/pages/HomePage')),
          },
          {
            // Parent route so nested pages get a "Patients ›" breadcrumb.
            path: 'patients',
            handle: { crumb: 'Patients' } satisfies RouteHandle,
            children: [
              { index: true, lazy: lazyPage(() => import('@/pages/PatientsPage')) },
              {
                // A static segment, so it wins over `:patientId`.
                path: 'new',
                handle: { crumb: 'New patient' } satisfies RouteHandle,
                lazy: lazyPage(() => import('@/pages/PatientCreatePage')),
              },
              {
                // Parent route so the edit page gets a "Patient details ›" breadcrumb.
                path: ':patientId',
                handle: { crumb: 'Patient details' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: lazyPage(() => import('@/pages/PatientDetailPage')) },
                  {
                    path: 'edit',
                    handle: { crumb: 'Edit' } satisfies RouteHandle,
                    lazy: lazyPage(() => import('@/pages/PatientEditPage')),
                  },
                ],
              },
            ],
          },
          {
            path: '*',
            handle: { crumb: 'Not found' } satisfies RouteHandle,
            lazy: lazyPage(() => import('@/pages/NotFoundPage')),
          },
        ],
      },
    ],
  },
])
