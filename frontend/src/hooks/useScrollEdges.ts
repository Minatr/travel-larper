import { type RefObject, useEffect, useState } from 'react'

import { prefersReducedMotion } from '../lib/screen.ts'

/** Gap under which a row counts as scrolled to its edge, in pixels: scroll positions are not always whole. */
const EDGE_TOLERANCE_PX = 2
/**
 * Whether more of a sideways scrolling row lies out of sight on each side, and the way to scroll it by a step: to the
 * next item cut off, brought whole to the row's start.
 */
export type ScrollEdges = { moreBefore: boolean; moreAfter: boolean; scrollStep: (direction: 1 | -1) => void }

/**
 * Follows the sideways scrolling row `rowRef` (its scrolling, its size, and its content's), to tell what lies beyond
 * its edges: a row whose last items are cut off hints at them, and gives a way to reach them without a trackpad. The
 * row's items are the children of its single child.
 */
export function useScrollEdges(rowRef: RefObject<HTMLElement | null>): ScrollEdges {
  const [edges, setEdges] = useState({ moreBefore: false, moreAfter: false })
  useEffect(() => {
    const row = rowRef.current
    if (row === null) {
      return
    }
    const update = () => {
      const moreBefore = row.scrollLeft > EDGE_TOLERANCE_PX
      const moreAfter = row.scrollLeft + row.clientWidth < row.scrollWidth - EDGE_TOLERANCE_PX
      setEdges((previous) =>
        previous.moreBefore === moreBefore && previous.moreAfter === moreAfter ? previous : { moreBefore, moreAfter },
      )
    }
    update()
    row.addEventListener('scroll', update, { passive: true })
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(row)
    for (const child of row.children) {
      resizeObserver.observe(child)
    }
    return () => {
      row.removeEventListener('scroll', update)
      resizeObserver.disconnect()
    }
  }, [rowRef])

  function scrollStep(direction: 1 | -1) {
    const row = rowRef.current
    const items = row?.firstElementChild?.children
    if (row === null || items === undefined) {
      return
    }
    const { left, right } = row.getBoundingClientRect()
    const style = getComputedStyle(row)
    const start = left + parseFloat(style.paddingLeft)
    const end = right - parseFloat(style.paddingRight)
    const boxes = [...items].map((item) => item.getBoundingClientRect())
    // Forward, the first item cut off on the end side; back, the last one cut off on the start side.
    const target =
      direction === 1
        ? boxes.find((box) => box.right > end + EDGE_TOLERANCE_PX)
        : boxes.findLast((box) => box.left < start - EDGE_TOLERANCE_PX)
    if (target === undefined) {
      return
    }
    row.scrollBy({ left: target.left - start, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
  return { ...edges, scrollStep }
}
