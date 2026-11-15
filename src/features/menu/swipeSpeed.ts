// How fast SpinningLogo's globe coasts after a swipe. Kept out of
// SpinningLogo.tsx so that file exports only components.

// The fastest a swipe can spin the globe, in degrees a second. Much faster and
// the land jumps too far between redraws to look like it is turning.
const MAX_SWIPE_SPEED = 720
// A swipe's speed is measured over the last moments of the drag, so a finger
// that stops before lifting lets the globe go still, easing back into its
// normal spin, rather than flinging it.
const SWIPE_SPEED_WINDOW_MS = 100

// Where the globe faced at a moment during a drag.
export type DragSample = {
  time: number
  facingLongitude: number
}

// The globe's speed when let go, in degrees a second, from the drag's samples
// within SWIPE_SPEED_WINDOW_MS of the release.
export function swipeSpeed(samples: DragSample[], releaseTime: number): number {
  const recent = samples.filter((sample) => releaseTime - sample.time <= SWIPE_SPEED_WINDOW_MS)
  if (recent.length < 2) {
    return 0
  }
  const first = recent[0]
  const last = recent[recent.length - 1]
  if (releaseTime === first.time) {
    return 0
  }
  // Divided by the time up to the release, not to the last sample: a finger
  // sends no samples while it rests, so a pause before lifting slows the swipe.
  const speed = ((last.facingLongitude - first.facingLongitude) / (releaseTime - first.time)) * 1000
  return Math.max(-MAX_SWIPE_SPEED, Math.min(MAX_SWIPE_SPEED, speed))
}
