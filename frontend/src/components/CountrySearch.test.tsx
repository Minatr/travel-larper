import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { CountrySearch } from './CountrySearch.tsx'

// The countries file, reduced to the codes the search reads.
function stubCountries(codes: string[]) {
  const countries = {
    type: 'FeatureCollection',
    features: codes.map((code) => ({
      type: 'Feature',
      properties: { code, colorGroup: 1 },
      geometry: { type: 'Polygon', coordinates: [] },
    })),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(countries)))),
  )
}

function renderSearch() {
  const onSelect = vi.fn()
  const onOpen = vi.fn()
  const search = (selected: string | null) => (
    <CountrySearch
      onSelect={onSelect}
      onOpen={onOpen}
      selected={selected}
      onFocusChange={vi.fn()}
      blurOnSelect={false}
    />
  )
  const { rerender } = render(search(null))
  const field = screen.getByRole('combobox', { name: 'Search for a country' })
  fireEvent.focus(field)
  return {
    field,
    onSelect,
    onOpen,
    rerenderWith: (selected: string | null) => rerender(search(selected)),
  }
}

describe('CountrySearch', () => {
  beforeAll(() => stubCountries(['FR', 'US', 'ES', 'AQ', 'GB']))
  afterAll(() => vi.unstubAllGlobals())

  it('lists the countries matching the text, accents aside', async () => {
    const { field } = renderSearch()

    fireEvent.change(field, { target: { value: 'SPÁIN' } })

    expect(
      await screen.findByRole('option', { name: 'Spain' }),
    ).toBeInTheDocument()
  })

  it('selects a country with Enter', async () => {
    const { field, onSelect } = renderSearch()
    fireEvent.change(field, { target: { value: 'fra' } })
    await screen.findByRole('option', { name: 'France' })

    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith('FR')
    expect(field).toHaveValue('France')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('opens the chosen country with Enter again, not with a double press', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    const { field, onOpen, rerenderWith } = renderSearch()
    fireEvent.change(field, { target: { value: 'fra' } })
    await screen.findByRole('option', { name: 'France' })
    fireEvent.keyDown(field, { key: 'Enter' })
    rerenderWith('FR')

    now.mockReturnValue(1200)
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onOpen).not.toHaveBeenCalled()

    now.mockReturnValue(2000)
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledOnce()
    now.mockRestore()
  })

  it('empties once its country is no longer selected', async () => {
    const { field, rerenderWith } = renderSearch()
    fireEvent.change(field, { target: { value: 'fra' } })
    await screen.findByRole('option', { name: 'France' })
    fireEvent.keyDown(field, { key: 'Enter' })
    rerenderWith('FR')
    expect(field).toHaveValue('France')

    rerenderWith(null)

    expect(field).toHaveValue('')
  })

  it('moves through the results with the arrow keys', async () => {
    const { field, onSelect } = renderSearch()
    fireEvent.change(field, { target: { value: 'united' } })
    await screen.findByRole('option', { name: 'United Kingdom' })

    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith('US')
  })

  it('finds a country by a common name', async () => {
    const { field } = renderSearch()

    fireEvent.change(field, { target: { value: 'uk' } })

    const option = await screen.findByRole('option', {
      name: /United Kingdom/,
    })
    expect(option).toHaveTextContent('United Kingdom · UK')
  })

  it('shows no result before the names are loaded', () => {
    const { field } = renderSearch()

    fireEvent.change(field, { target: { value: 'xyz' } })

    expect(screen.queryByText('No country found')).not.toBeInTheDocument()
  })

  it('leaves out Antarctica, which has no map', async () => {
    const { field } = renderSearch()

    fireEvent.change(field, { target: { value: 'antar' } })

    expect(await screen.findByText('No country found')).toBeInTheDocument()
  })

  it('closes the results with Escape', async () => {
    const { field } = renderSearch()
    fireEvent.change(field, { target: { value: 'fra' } })
    await screen.findByRole('option', { name: 'France' })

    fireEvent.keyDown(field, { key: 'Escape' })

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})
