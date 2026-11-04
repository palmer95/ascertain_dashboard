import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/layout/AppLayout'

import type { RouteHandle } from './route-handle'

/** Code-split a page: its chunk loads on first navigation to the route. */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default })
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    hydrateFallbackElement: null,
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
            path: ':patientId',
            handle: { crumb: 'Patient details' } satisfies RouteHandle,
            lazy: lazyPage(() => import('@/pages/PatientDetailPage')),
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
])
