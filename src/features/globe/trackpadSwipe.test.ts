import { describe, expect, it } from 'vitest'
import { isMouseWheelStart } from './trackpadSwipe'

function wheel(deltaX: number, deltaY: number, deltaMode: number = WheelEvent.DOM_DELTA_PIXEL) {
  return new WheelEvent('wheel', { deltaX, deltaY, deltaMode })
}

describe('isMouseWheelStart', () => {
  it('takes a scroll by lines for a mouse wheel', () => {
    expect(isMouseWheelStart(wheel(0, 3, WheelEvent.DOM_DELTA_LINE))).toBe(true)
  })

  it("takes a Mac mouse wheel's notch for a mouse wheel", () => {
    expect(isMouseWheelStart(wheel(0, 4.000244140625))).toBe(true)
    expect(isMouseWheelStart(wheel(0, -3 * 4.000244140625))).toBe(true)
  })

  it("takes a Windows mouse wheel's notch for a mouse wheel", () => {
    expect(isMouseWheelStart(wheel(0, 100))).toBe(true)
  })

  it('takes small movements for a trackpad', () => {
    expect(isMouseWheelStart(wheel(0, 2))).toBe(false)
    expect(isMouseWheelStart(wheel(0, -7))).toBe(false)
  })

  it('takes any sideways movement for a trackpad', () => {
    expect(isMouseWheelStart(wheel(1, 100))).toBe(false)
  })
})
