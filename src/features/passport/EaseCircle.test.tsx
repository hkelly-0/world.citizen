import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EaseCircle, easeColour, easeFraction } from './EaseCircle'

describe('easeFraction', () => {
  it('fills 1/6 at the lowest ease and all of it at 2.7 or above', () => {
    expect(easeFraction(1.3)).toBeCloseTo(1 / 6)
    expect(easeFraction(2.7)).toBeCloseTo(1)
    expect(easeFraction(3.5)).toBeCloseTo(1)
  })

  it('fills in a straight line between', () => {
    // Halfway between 1.3 and 2.7.
    expect(easeFraction(2.0)).toBeCloseTo(1 / 6 + 5 / 12)
  })
})

describe('easeColour', () => {
  it('runs from red at the lowest ease to green when full', () => {
    expect(easeColour(1.3)).toBe('hsl(0, 80%, 50%)')
    expect(easeColour(2.0)).toBe('hsl(60, 80%, 50%)')
    expect(easeColour(2.7)).toBe('hsl(120, 80%, 50%)')
  })
})

describe('EaseCircle', () => {
  it('is labelled with the ease, or as having none', () => {
    render(
      <>
        <EaseCircle ease={2.3} />
        <EaseCircle ease={null} />
      </>,
    )
    expect(screen.getByRole('img', { name: 'Ease 2.3' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No ease yet' })).toBeInTheDocument()
  })
})
