import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'

// Each page is code-split and loaded on first navigation.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    hydrateFallbackElement: null,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/pages/HomePage')).default }),
      },
      {
        path: 'patients',
        lazy: async () => ({ Component: (await import('@/pages/PatientsPage')).default }),
      },
      {
        path: 'patients/:patientId',
        lazy: async () => ({
          Component: (await import('@/pages/PatientDetailPage')).default,
        }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).default }),
      },
    ],
  },
])
