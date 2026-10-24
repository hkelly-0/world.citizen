import { useEffect, useRef } from 'react'

// A click that moved further than this (in pixels) between pressing and
// releasing was a drag, e.g. spinning a globe.
const DRAG_PX = 8

// While `isActive`, a click anywhere on the page calls `onContinue`, as if the
// screen's Next button had been pressed. Clicks on buttons, links and inputs are
// left alone (so the Next button itself, the back button and the dev tab keep
// working), as are drags and the click that made the button appear.
export function useClickAnywhereToContinue(isActive: boolean, onContinue: () => void) {
  // Always the latest callback, so the listener below needn't be re-added.
  const onContinueRef = useRef(onContinue)
  useEffect(() => {
    onContinueRef.current = onContinue
  })

  useEffect(() => {
    if (!isActive) return

    // The click that revealed the answer may still be travelling up to the
    // document when this listener is added; its time stamp is earlier.
    const activeSince = performance.now()
    let pressX = 0
    let pressY = 0

    function onPointerDown(event: PointerEvent) {
      pressX = event.clientX
      pressY = event.clientY
    }

    function onClick(event: MouseEvent) {
      if (event.timeStamp < activeSince) return
      const wasDrag = Math.hypot(event.clientX - pressX, event.clientY - pressY) > DRAG_PX
      if (wasDrag) return
      const target = event.target
      if (target instanceof Element && target.closest('button, a, input, label')) return
      onContinueRef.current()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('click', onClick)
    }
  }, [isActive])
}
