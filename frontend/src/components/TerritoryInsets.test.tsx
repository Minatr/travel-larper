import { fireEvent, render, screen } from '@testing-library/react'
import type { MultiPolygon } from 'geojson'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { InsetMap } from '../lib/countryMapData.ts'
import { findInset } from '../lib/territories.ts'
import { TerritoryInsets } from './TerritoryInsets.tsx'

const square: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [-53, 3],
        [-52, 3],
        [-52, 4],
        [-53, 4],
        [-53, 3],
      ],
    ],
  ],
}

function renderInsets(current: 'french-guiana' | null) {
  const guiana = findInset('FR', 'french-guiana')
  if (guiana === null) {
    throw new Error('French Guiana is missing from the insets')
  }
  const insets: InsetMap[] = [{ inset: guiana, bounds: [-54, 2, -51, 6], shape: square }]
  const element = (
    <TerritoryInsets
      insets={insets}
      current={current}
      countryName="France"
      mainShape={square}
      mainBounds={[-5, 42, 8, 51]}
    />
  )
  render(
    <RouterProvider router={createMemoryRouter([{ path: '*', element }], { initialEntries: ['/countries/FR'] })} />,
  )
}

describe('TerritoryInsets', () => {
  it('prints how far each territory lies from the capital', () => {
    renderInsets(null)

    expect(screen.getByRole('link', { name: /French Guiana/ })).toHaveTextContent('7,250 km')
  })

  it('gives the mainland a tag, with its distance, once on a territory', () => {
    renderInsets('french-guiana')

    const mainland = screen.getByRole('link', { name: /France/ })
    expect(mainland).toHaveAttribute('href', '/countries/FR')
    expect(mainland).toHaveTextContent('7,250 km')
    expect(screen.queryByRole('link', { name: /French Guiana/ })).not.toBeInTheDocument()
  })

  it('starts out, and remembers the drawer put away', () => {
    renderInsets(null)
    const tab = screen.getByRole('button', { name: /Distant territory/ })
    expect(tab).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(tab)

    expect(tab).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem('territoryInsetsOpen')).toBe('false')
  })

  it('names the drawer in the singular for a single territory', () => {
    renderInsets(null)

    expect(screen.getByRole('navigation', { name: 'Distant territory' })).toBeInTheDocument()
  })

  it('shows no scroll arrow when every pass fits', () => {
    renderInsets(null)

    expect(screen.queryByRole('button', { name: 'Next territories' })).not.toBeInTheDocument()
  })
})
