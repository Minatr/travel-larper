import { describe, expect, it } from 'vitest'

import {
  EMPTY_SELECTION,
  type GlobeEvent,
  type GlobeSelection,
  raisedCountries,
  reduceSelection,
} from './globeSelection.ts'

describe('reduceSelection', () => {
  const tests: {
    name: string
    state: GlobeSelection
    event: GlobeEvent
    want: GlobeSelection
  }[] = [
    {
      name: 'hovering a country',
      state: EMPTY_SELECTION,
      event: { type: 'hover', code: 'FR' },
      want: { hovered: 'FR', selected: null },
    },
    {
      name: 'leaving a country keeps the selection',
      state: { hovered: 'FR', selected: 'FR' },
      event: { type: 'hover', code: null },
      want: { hovered: null, selected: 'FR' },
    },
    {
      name: 'clicking a country selects it',
      state: EMPTY_SELECTION,
      event: { type: 'click', code: 'JP' },
      want: { hovered: null, selected: 'JP' },
    },
    {
      name: 'clicking another country moves the selection',
      state: { hovered: 'IT', selected: 'JP' },
      event: { type: 'click', code: 'IT' },
      want: { hovered: 'IT', selected: 'IT' },
    },
    {
      name: 'clicking the ocean clears the selection',
      state: { hovered: null, selected: 'JP' },
      event: { type: 'click', code: null },
      want: { hovered: null, selected: null },
    },
  ]

  it.each(tests)('$name', ({ state, event, want }) => {
    expect(reduceSelection(state, event)).toEqual(want)
  })
})

describe('raisedCountries', () => {
  it('raises the hovered and the selected country', () => {
    expect(raisedCountries({ hovered: 'FR', selected: 'JP' })).toEqual(
      new Set(['FR', 'JP']),
    )
  })

  it('raises a country once when it is both hovered and selected', () => {
    expect(raisedCountries({ hovered: 'FR', selected: 'FR' })).toEqual(
      new Set(['FR']),
    )
  })

  it('raises nothing by default', () => {
    expect(raisedCountries(EMPTY_SELECTION)).toEqual(new Set())
  })
})
