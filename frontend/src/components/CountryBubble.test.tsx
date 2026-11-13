import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TagLayout } from '../lib/countryTag.ts'
import { CountryBubble } from './CountryBubble.tsx'

const LAYOUT: TagLayout = {
  anchor: { x: 300, y: 200 },
  eyelet: { x: 360, y: 180 },
  side: 'right',
  tiltDegrees: -2,
}

describe('CountryBubble', () => {
  it('shows nothing while no country is hovered', () => {
    const { container } = render(<CountryBubble hint={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('names the hovered country and how to open it', () => {
    render(<CountryBubble hint={{ code: 'FR', layout: LAYOUT }} />)

    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByText('Click to open the map')).toBeInTheDocument()
    expect(
      screen.queryByText('No map for this country'),
    ).not.toBeInTheDocument()
  })

  it('tells a country has no map', () => {
    render(
      <CountryBubble
        hint={{ code: 'AQ', layout: { ...LAYOUT, side: 'left' } }}
      />,
    )

    expect(screen.getByText('No map for this country')).toBeInTheDocument()
  })
})
