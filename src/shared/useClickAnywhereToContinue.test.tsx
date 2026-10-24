import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useClickAnywhereToContinue } from './useClickAnywhereToContinue'

function Screen({ isActive, onContinue }: { isActive: boolean; onContinue: () => void }) {
  useClickAnywhereToContinue(isActive, onContinue)
  return (
    <div>
      <p>Some text</p>
      <button>A button</button>
    </div>
  )
}

describe('useClickAnywhereToContinue', () => {
  it('continues on a click on plain content', () => {
    const onContinue = vi.fn()
    render(<Screen isActive onContinue={onContinue} />)
    fireEvent.click(screen.getByText('Some text'))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('ignores clicks on buttons', () => {
    const onContinue = vi.fn()
    render(<Screen isActive onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: 'A button' }))
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('ignores clicks when inactive', () => {
    const onContinue = vi.fn()
    render(<Screen isActive={false} onContinue={onContinue} />)
    fireEvent.click(screen.getByText('Some text'))
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('ignores a drag', () => {
    const onContinue = vi.fn()
    render(<Screen isActive onContinue={onContinue} />)
    fireEvent.pointerDown(document.body, { clientX: 0, clientY: 0 })
    fireEvent.click(screen.getByText('Some text'), { clientX: 100, clientY: 0 })
    expect(onContinue).not.toHaveBeenCalled()
  })
})
