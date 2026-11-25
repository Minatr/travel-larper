import { type PointerEvent, useRef, useState } from 'react'

/** Distance a finger must slide to pull the drawer up or fold it down, in pixels. */
const SWIPE_PX = 40
/** How far a folded drawer follows a finger pulling it up before it opens, in pixels: a hint, not a full drag. */
const FOLDED_PULL_PX = 60

/**
 * Lets a finger drag a bottom drawer by its top: open, it follows the finger down; folded, it rises a little with it.
 * Released past SWIPE_PX, it opens or folds; otherwise it springs back. `offset` is how far to move the drawer now,
 * `dragging` whether to drop its transition meanwhile. A click that ends a drag is not a tap (`isTap`).
 */
export function useDrawerDrag(open: boolean, setOpen: (open: boolean) => void) {
  const startY = useRef<number | null>(null)
  const dragged = useRef(false)
  const [offset, setOffset] = useState(0)

  function follow(distance: number) {
    // Open: only down. Folded: only up, braked.
    setOffset(open ? Math.max(0, distance) : Math.max(-FOLDED_PULL_PX, Math.min(0, distance / 2)))
  }

  return {
    offset,
    // Released, the offset goes back to 0, with the transition: the drawer springs to its place.
    dragging: offset !== 0,
    handlers: {
      onPointerDown: (event: PointerEvent) => {
        // A finger only: on a computer, the panel stays put.
        if (event.pointerType !== 'touch') {
          return
        }
        startY.current = event.clientY
        dragged.current = false
      },
      onPointerMove: (event: PointerEvent) => {
        if (startY.current !== null) {
          follow(event.clientY - startY.current)
        }
      },
      onPointerUp: (event: PointerEvent) => {
        if (startY.current === null) {
          return
        }
        const distance = event.clientY - startY.current
        startY.current = null
        setOffset(0)
        if (Math.abs(distance) >= SWIPE_PX) {
          dragged.current = true
          setOpen(distance < 0)
        }
      },
      onPointerCancel: () => {
        startY.current = null
        setOffset(0)
      },
    },
    isTap: () => {
      const tap = !dragged.current
      dragged.current = false
      return tap
    },
  }
}
