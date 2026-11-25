import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CountryInfoPanel } from './CountryInfoPanel.tsx'

function renderPanel(territories: { count: number; list: ReactNode } | null = null) {
  render(
    <MemoryRouter>
      <CountryInfoPanel code="FR" title="France" territories={territories} />
    </MemoryRouter>,
  )
}

function stubInfo(summary: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        Response.json({ code: 'FR', currencies: ['EUR'], languages: [{ code: 'fr', name: 'French' }], summary }),
      ),
    ),
  )
}

describe('CountryInfoPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('asks the backend in the app language, and shows the way back, the flag and the name', async () => {
    stubInfo({ status: 'available', text: 'A country.', url: 'https://w/France' })

    renderPanel()

    expect(fetch).toHaveBeenCalledWith('/api/countries/FR?lang=en', expect.anything())
    expect(screen.getByRole('link', { name: 'Back to the globe' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(await screen.findByText('A country.')).toBeInTheDocument()
  })

  it('says when the summary is missing in this language, without another language', async () => {
    stubInfo({ status: 'missing' })

    renderPanel()

    expect(await screen.findByText('No summary in English for this country yet.')).toBeInTheDocument()
    expect(screen.getAllByText('Euro · €').length).toBeGreaterThan(0)
  })

  it('keeps the facts when only the summary is unavailable', async () => {
    stubInfo({ status: 'unavailable' })

    renderPanel()

    expect(await screen.findByText('The summary is unavailable for now. Try again later.')).toBeInTheDocument()
    expect(screen.getAllByText('French').length).toBeGreaterThan(0)
  })

  it('says when the backend cannot answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderPanel()

    expect(
      await screen.findByText('This country’s information is unavailable for now. Try again later.'),
    ).toBeInTheDocument()
  })

  it('unfolds and folds on a phone with its handle', async () => {
    stubInfo({ status: 'missing' })
    renderPanel()
    await screen.findByText('No summary in English for this country yet.')

    const handle = screen.getByRole('button', { name: 'Show the whole country sheet' })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(handle)

    expect(screen.getByRole('button', { name: 'Fold the country sheet' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('has no tabs without distant territories', async () => {
    stubInfo({ status: 'missing' })
    renderPanel()
    await screen.findByText('No summary in English for this country yet.')

    fireEvent.click(screen.getByRole('button', { name: 'Show the whole country sheet' }))

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('shows the distant territories in their own tab once unfolded', async () => {
    stubInfo({ status: 'missing' })
    renderPanel({ count: 5, list: <p>Passes</p> })
    await screen.findByText('No summary in English for this country yet.')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show the whole country sheet' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Distant territories 5' }))

    expect(screen.getByRole('tab', { name: 'Distant territories 5' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Passes')).toBeInTheDocument()
  })

  it('unfolds and folds when a finger drags its top', async () => {
    stubInfo({ status: 'missing' })
    renderPanel()
    await screen.findByText('No summary in English for this country yet.')
    const handle = screen.getByRole('button', { name: 'Show the whole country sheet' })

    fireEvent.pointerDown(handle, { pointerType: 'touch', clientY: 500 })
    fireEvent.pointerUp(handle, { pointerType: 'touch', clientY: 400 })
    fireEvent.click(handle)

    expect(handle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.pointerDown(handle, { pointerType: 'touch', clientY: 400 })
    fireEvent.pointerUp(handle, { pointerType: 'touch', clientY: 500 })
    fireEvent.click(handle)

    expect(handle).toHaveAttribute('aria-expanded', 'false')
  })
})
