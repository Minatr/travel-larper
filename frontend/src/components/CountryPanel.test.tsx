import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CountryPanel } from './CountryPanel.tsx'

describe('CountryPanel', () => {
  it('shows nothing until a country is tapped', () => {
    const { container } = render(<CountryPanel code={null} onOpen={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('names the tapped country and opens it from its button', () => {
    const onOpen = vi.fn()
    render(<CountryPanel code="FR" onOpen={onOpen} />)

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open the map' }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('closes from its close button, when it has one', () => {
    const onClose = vi.fn()
    render(<CountryPanel code="FR" onOpen={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has no close button by default', () => {
    render(<CountryPanel code="FR" onOpen={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument()
  })

  it('has no button for a country without a map', () => {
    render(<CountryPanel code="AQ" onOpen={vi.fn()} />)

    expect(screen.getByText('No map for this country')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
