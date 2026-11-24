import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useKeyPress } from './useKeyPress.ts'

function press(key: string, target: EventTarget = window, prevent = false) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  if (prevent) {
    event.preventDefault()
  }
  target.dispatchEvent(event)
}

describe('useKeyPress', () => {
  it('calls back on its key only', () => {
    const onPress = vi.fn()
    renderHook(() => useKeyPress('Escape', onPress))

    press('Enter')
    press('Escape')

    expect(onPress).toHaveBeenCalledOnce()
  })

  it('does nothing while disabled', () => {
    const onPress = vi.fn()
    renderHook(() => useKeyPress('Escape', onPress, { enabled: false }))

    press('Escape')

    expect(onPress).not.toHaveBeenCalled()
  })

  it('leaves a key already used by a field', () => {
    const onPress = vi.fn()
    renderHook(() => useKeyPress('Escape', onPress))

    press('Escape', window, true)

    expect(onPress).not.toHaveBeenCalled()
  })

  it('leaves a key pressed on a control, when asked to', () => {
    const onPress = vi.fn()
    renderHook(() => useKeyPress('Enter', onPress, { skipControls: true }))
    const button = document.body.appendChild(document.createElement('button'))

    press('Enter', button)
    press('Enter', document.body)

    expect(onPress).toHaveBeenCalledOnce()
    button.remove()
  })
})
