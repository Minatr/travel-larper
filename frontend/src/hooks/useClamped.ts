import { type RefObject, useLayoutEffect, useState } from 'react'

/**
 * Whether the element cut by `line-clamp` hides some of its text, measured again when `content` changes or the element
 * is resized: "Read more" is only offered when there is more to read.
 */
export function useClamped(ref: RefObject<HTMLElement | null>, content: string): boolean {
  const [clamped, setClamped] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) {
      return
    }
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, content])
  return clamped
}
