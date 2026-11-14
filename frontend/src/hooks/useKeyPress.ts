import { useEffect, useRef } from 'react'

/** Elements that already act on keys (Enter on a button clicks it). */
const CONTROLS = 'input, textarea, select, button, a'

/**
 * Calls `onPress` on `key`, wherever the focus is, while `enabled`. A key
 * already used by a field (default prevented) is left alone, and so is
 * one pressed on a control when `skipControls`.
 */
export function useKeyPress(
  key: string,
  onPress: () => void,
  { enabled = true, skipControls = false } = {},
) {
  const onPressRef = useRef(onPress)
  useEffect(() => {
    onPressRef.current = onPress
  })

  useEffect(() => {
    if (!enabled) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      const onControl =
        event.target instanceof Element && event.target.closest(CONTROLS)
      if (
        event.key === key &&
        !event.defaultPrevented &&
        !(skipControls && onControl)
      ) {
        onPressRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, enabled, skipControls])
}
