import { useSyncExternalStore } from 'react'

/*
 * Light, dark, or follow the operating system. The choice is a per-browser preference, so it
 * lives in localStorage; `index.html` applies it before the first paint (no white flash in dark
 * mode), and this module keeps it in sync afterwards: on change, when the OS setting changes
 * while on "system", and across open tabs.
 *
 * Keep STORAGE_KEY and the resolve logic in step with the inline script in `index.html`.
 */

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

const STORAGE_KEY = 'theme'
const DARK_QUERY = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

let current = readStoredTheme()

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEMES.find((theme) => theme === stored) ?? 'system'
  } catch {
    return 'system' // Storage can be blocked (privacy settings); fall back to the OS.
  }
}

function apply() {
  const isDark = current === 'dark' || (current === 'system' && DARK_QUERY.matches)
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  // Native controls (date pickers, scrollbars, autofill) follow the theme too.
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

function update(theme: Theme) {
  current = theme
  apply()
  for (const listener of listeners) listener()
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Not persisted, but still applied for this visit.
  }
  update(theme)
}

DARK_QUERY.addEventListener('change', () => {
  if (current === 'system') apply()
})

// Another tab changed the theme.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) update(readStoredTheme())
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, () => current)
}
