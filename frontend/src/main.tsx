import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from '@/api/client'
import { App } from '@/app/App'
import { setClinicTimeZone } from '@/lib/format'
import './index.css'

/**
 * Times are shown on the clinic's clock, so read its time zone before the first render. If the
 * API can't be reached, the browser's zone is used and the pages show their own errors.
 */
async function loadClinicTimeZone() {
  try {
    const { data } = await api.GET('/config')
    if (data) setClinicTimeZone(data.clinic_timezone)
  } catch {
    // Offline or API down: fall back to the browser's time zone.
  }
}

void loadClinicTimeZone().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
