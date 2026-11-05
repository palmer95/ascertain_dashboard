import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'

/**
 * Runs `callback` once calls stop for `delay` ms. `flush` runs a pending call immediately
 * (Enter, leaving the field); a call still pending on unmount is dropped, never run late
 * against a page the user has already left.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
) {
  const callbackRef = useRef(callback)
  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  const timer = useRef<number>(undefined)
  const pending = useRef<Args>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return useMemo(() => {
    function run() {
      window.clearTimeout(timer.current)
      const args = pending.current
      pending.current = undefined
      if (args) callbackRef.current(...args)
    }
    return {
      call(...args: Args) {
        pending.current = args
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(run, delay)
      },
      flush: run,
    }
  }, [delay])
}
