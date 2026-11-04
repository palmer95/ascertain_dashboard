import { useSyncExternalStore } from 'react'

// Matches Tailwind's `md` breakpoint: below it, the sidebar becomes a drawer.
const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Rewritten from the shadcn-generated version (useState + setState in an effect) to
// useSyncExternalStore: the correct value on the first render (no desktop-layout flash on
// phones) and no extra render, which the react-hooks lint rules flag.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
