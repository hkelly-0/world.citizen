import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecallCircle, recallColour, recallFraction } from './RecallCircle'

describe('recallFraction', () => {
  it('fills 1/6 at a recall chance of 50% or less and all of it at 100%', () => {
    expect(recallFraction(0.2)).toBeCloseTo(1 / 6)
    expect(recallFraction(0.5)).toBeCloseTo(1 / 6)
    expect(recallFraction(1)).toBeCloseTo(1)
  })

  it('fills in a straight line between', () => {
    // Halfway between 50% and 100%.
    expect(recallFraction(0.75)).toBeCloseTo(1 / 6 + 5 / 12)
  })
})

describe('recallColour', () => {
  it('runs from red at the smallest fill to green when full', () => {
    expect(recallColour(0.5)).toBe('hsl(0, 80%, 50%)')
    expect(recallColour(0.75)).toBe('hsl(60, 80%, 50%)')
    expect(recallColour(1)).toBe('hsl(120, 80%, 50%)')
  })
})

describe('RecallCircle', () => {
  it('is labelled with the recall chance, or as having none', () => {
    render(
      <>
        <RecallCircle recall={0.873} />
        <RecallCircle recall={null} />
      </>,
    )
    expect(screen.getByRole('img', { name: 'Familiarity 87%' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No familiarity yet' })).toBeInTheDocument()
  })
})
