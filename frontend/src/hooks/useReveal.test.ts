import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MAP_WAIT_MS } from '../lib/countryTransition.ts'
import { useReveal } from './useReveal.ts'

describe('useReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the page once the map is ready and the globe has landed', () => {
    const { result, rerender } = renderHook(({ flying }) => useReveal(flying), {
      initialProps: { flying: true },
    })

    act(() => result.current.onMapReady())
    expect(result.current.visible).toBe(false)

    rerender({ flying: false })
    expect(result.current).toMatchObject({ visible: true, loading: false })
  })

  it('shows the page without waiting when there is no flight', () => {
    const { result } = renderHook(() => useReveal(false))

    act(() => result.current.onMapReady())

    expect(result.current.visible).toBe(true)
  })

  it('shows the page with a loading map once the wait is over', () => {
    const { result } = renderHook(() => useReveal(false))
    expect(result.current.visible).toBe(false)

    act(() => vi.advanceTimersByTime(MAP_WAIT_MS))

    expect(result.current).toMatchObject({ visible: true, loading: true })
  })

  it('tells when the map failed', () => {
    const { result } = renderHook(() => useReveal(false))

    act(() => result.current.onMapFailed())

    expect(result.current).toMatchObject({ failed: true, loading: false })
  })
})
