import { type RefObject, useEffect } from 'react'

/** CSS variable, set on the drawer's parent (which holds the map too), read by index.css to lift the map's credit. */
const LIFT_VARIABLE = '--territory-drawer-height'

/**
 * Lifts the map's credit button above the territories' drawer `drawerRef` while it is open: on a phone the drawer
 * spans the screen's width, and would cover the credit, which must stay visible. Follows the drawer's height.
 */
export function useLiftedCredit(drawerRef: RefObject<HTMLElement | null>, open: boolean): void {
  useEffect(() => {
    const drawer = drawerRef.current
    const host = drawer?.parentElement
    if (drawer === null || host === null || host === undefined) {
      return
    }
    const lift = () => host.style.setProperty(LIFT_VARIABLE, open ? `${drawer.offsetHeight}px` : '0px')
    lift()
    const resizeObserver = new ResizeObserver(lift)
    resizeObserver.observe(drawer)
    return () => {
      resizeObserver.disconnect()
      host.style.removeProperty(LIFT_VARIABLE)
    }
  }, [drawerRef, open])
}
