import { type RefObject, useLayoutEffect, useState } from 'react'

/**
 * Height of the element `ref`, in pixels, measured again whenever it changes size: a parent given this height in CSS
 * can animate it, where a height of `auto` would jump.
 */
export function useMeasuredHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) {
      return
    }
    const measure = () => setHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return height
}
