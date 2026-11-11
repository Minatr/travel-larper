import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { CountryBubble } from './CountryBubble.tsx'

describe('CountryBubble', () => {
  it('stays hidden while no country is hovered', () => {
    const ref = createRef<HTMLDivElement>()
    render(<CountryBubble code={null} ref={ref} />)

    expect(ref.current).toHaveClass('invisible')
  })

  it('names the hovered country', () => {
    render(<CountryBubble code="FR" ref={createRef()} />)

    expect(screen.getByText('France')).toBeInTheDocument()
    expect(
      screen.queryByText('No map for this country'),
    ).not.toBeInTheDocument()
  })

  it('tells a country has no map', () => {
    render(<CountryBubble code="AQ" ref={createRef()} />)

    expect(screen.getByText('No map for this country')).toBeInTheDocument()
  })
})
