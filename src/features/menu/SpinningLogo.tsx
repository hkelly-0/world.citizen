import { geoOrthographic, geoPath } from 'd3-geo'
import type { MultiPolygon } from 'geojson'
import { useEffect, useRef } from 'react'
import logoLand from '../../data/logoLand.json' with { type: 'json' }

// The app icon (see scripts/make-app-icon.mjs) with its globe head spinning:
// the land is redrawn every frame as the globe turns west to east. It can be
// swiped left or right: it turns with the finger, then coasts at the speed it
// was let go, slowing (and if need be reversing) back to its normal spin. The shapes,
// sizes and colours are the same as in that script, which draws the still
// icons; change both together.

const BACKGROUND_COLOR = '#000010'
const PERSON_COLOR = '#99ddff'
const SEA_COLOR = PERSON_COLOR
const LAND_COLOR = '#009900'

// Design coordinates, on a 1024 square.
const CENTRE = 512
const RING_RADIUS = 440
const RING_WIDTH = 34
const RING_OUTER_RADIUS = RING_RADIUS + RING_WIDTH / 2
const HEAD_CENTRE_Y = 415
const HEAD_RADIUS = 225
const SHOULDERS_CENTRE_Y = 965
const SHOULDERS_HALF_WIDTH = 370
const SHOULDERS_HALF_HEIGHT = 280

// Where the globe faces when the menu opens (and stays, unless swiped, if the
// device asks for reduced motion): between North and South America, a little
// east of the still icon's view.
const GLOBE_FACING = { longitude: -60, latitude: 8 }
// How long one full turn of the globe takes.
const SECONDS_PER_TURN = 25
// The most times a second the land is redrawn. At the logo's size it moves a
// few pixels a second, so this still looks smooth, while saving the phone the
// work of redrawing every frame.
const MAX_REDRAWS_PER_SECOND = 30
// Decimal places for coordinates in the land's SVG path, to keep it short.
const PATH_DIGITS = 1

// The normal spin, in degrees of longitude a second. Turning west to east
// moves the land rightwards, bringing in land from further west, so the
// longitude facing the viewer decreases.
const NORMAL_SPIN_SPEED = -360 / SECONDS_PER_TURN
// After a swipe, the difference between the globe's speed and the normal spin
// shrinks to about a third every SLOW_DOWN_SECONDS, so it has nearly settled
// after three of them.
const SLOW_DOWN_SECONDS = 1
// The fastest a swipe can spin the globe, in degrees a second. Much faster and
// the land jumps too far between redraws to look like it is turning.
const MAX_SWIPE_SPEED = 720
// A swipe's speed is measured over the last moments of the drag, so a finger
// that stops before lifting lets the globe go still, easing back into its
// normal spin, rather than flinging it.
const SWIPE_SPEED_WINDOW_MS = 100

const VIEW_BOX_START = CENTRE - RING_OUTER_RADIUS
const VIEW_BOX_SIZE = 2 * RING_OUTER_RADIUS

// Natural Earth 1:110m land, simplified by scripts/make-logo-land.mjs so
// each redraw has fewer points to project.
const land = logoLand as MultiPolygon

// The SVG path of the land with the globe facing the given longitude.
function landPath(facingLongitude: number): string {
  const projection = geoOrthographic()
    .rotate([-facingLongitude, -GLOBE_FACING.latitude])
    .scale(HEAD_RADIUS)
    .translate([CENTRE, HEAD_CENTRE_Y])
    .clipAngle(90)
    // Joins the points with straight lines rather than adding more along each
    // edge to follow the globe's curve, which is too slight to see at the
    // logo's size.
    .precision(0)
  return geoPath(projection).digits(PATH_DIGITS)(land) ?? ''
}

function prefersReducedMotion(): boolean {
  // matchMedia is missing in tests.
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

// Where the globe faced at a moment during a drag.
type DragSample = {
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

type SpinningLogoProps = {
  className?: string
}

export function SpinningLogo({ className }: SpinningLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const landRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) {
      return
    }
    // With reduced motion the globe only moves while dragged: it has no
    // normal spin and doesn't coast after a swipe.
    const reducedMotion = prefersReducedMotion()
    const normalSpeed = reducedMotion ? 0 : NORMAL_SPIN_SPEED

    let facingLongitude = GLOBE_FACING.longitude
    // Degrees of longitude a second, negative when turning west to east.
    let speed = normalSpeed
    // The finger (or mouse) dragging the globe, if any. Other fingers are
    // ignored until it lifts.
    let drag: { pointerId: number; lastX: number; samples: DragSample[] } | null = null

    function draw() {
      landRef.current?.setAttribute('d', landPath(facingLongitude))
    }

    function startDrag(event: PointerEvent) {
      if (drag !== null || svg === null) {
        return
      }
      drag = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        samples: [{ time: event.timeStamp, facingLongitude }],
      }
      // Keeps the drag going if the finger slides off the small logo.
      svg.setPointerCapture(event.pointerId)
    }

    function moveDrag(event: PointerEvent) {
      if (drag === null || event.pointerId !== drag.pointerId || svg === null) {
        return
      }
      const headRadiusOnScreen = (HEAD_RADIUS * svg.getBoundingClientRect().width) / VIEW_BOX_SIZE
      // Turns the globe so the land at its centre stays under the finger: it
      // moves one radius on screen per radian turned. Dragging right moves the
      // land right, so the longitude facing the viewer decreases.
      const movedRadians = (event.clientX - drag.lastX) / headRadiusOnScreen
      facingLongitude -= movedRadians * (180 / Math.PI)
      drag.lastX = event.clientX
      drag.samples.push({ time: event.timeStamp, facingLongitude })
      draw()
    }

    function endDrag(event: PointerEvent) {
      if (drag === null || event.pointerId !== drag.pointerId) {
        return
      }
      speed = reducedMotion ? 0 : swipeSpeed(drag.samples, event.timeStamp)
      drag = null
    }

    // E.g. the browser taking over a mostly vertical swipe to scroll the page.
    // The globe goes back to its normal spin rather than coasting, as the
    // finger's small moves before the scroll began weren't meant as a swipe.
    function cancelDrag(event: PointerEvent) {
      if (drag === null || event.pointerId !== drag.pointerId) {
        return
      }
      speed = normalSpeed
      drag = null
    }

    svg.addEventListener('pointerdown', startDrag)
    svg.addEventListener('pointermove', moveDrag)
    svg.addEventListener('pointerup', endDrag)
    svg.addEventListener('pointercancel', cancelDrag)

    let frame = 0
    let lastDrawTime: number | null = null

    function drawFrame(time: number) {
      frame = requestAnimationFrame(drawFrame)
      if (lastDrawTime !== null && time - lastDrawTime < 1000 / MAX_REDRAWS_PER_SECOND) {
        return
      }
      const seconds = lastDrawTime === null ? 0 : (time - lastDrawTime) / 1000
      lastDrawTime = time
      // While dragged, the globe moves only with the finger.
      if (drag !== null) {
        return
      }
      // Eases the speed towards the normal spin, passing through zero (so
      // reversing) if a swipe sent the globe the other way. Worked out from the
      // time since the last redraw, so it is the same however often frames come.
      speed = normalSpeed + (speed - normalSpeed) * Math.exp(-seconds / SLOW_DOWN_SECONDS)
      facingLongitude += speed * seconds
      draw()
    }

    if (!reducedMotion) {
      frame = requestAnimationFrame(drawFrame)
    }
    return () => {
      cancelAnimationFrame(frame)
      svg.removeEventListener('pointerdown', startDrag)
      svg.removeEventListener('pointermove', moveDrag)
      svg.removeEventListener('pointerup', endDrag)
      svg.removeEventListener('pointercancel', cancelDrag)
    }
  }, [])

  return (
    // Decorative, as the title below it names the app.
    <svg
      ref={svgRef}
      className={className}
      viewBox={`${VIEW_BOX_START} ${VIEW_BOX_START} ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      aria-hidden="true"
    >
      <clipPath id="spinning-logo-inside-ring">
        <circle cx={CENTRE} cy={CENTRE} r={RING_RADIUS} />
      </clipPath>
      <circle cx={CENTRE} cy={CENTRE} r={RING_OUTER_RADIUS} fill={BACKGROUND_COLOR} />
      <ellipse
        cx={CENTRE}
        cy={SHOULDERS_CENTRE_Y}
        rx={SHOULDERS_HALF_WIDTH}
        ry={SHOULDERS_HALF_HEIGHT}
        fill={PERSON_COLOR}
        clipPath="url(#spinning-logo-inside-ring)"
      />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RING_RADIUS}
        fill="none"
        stroke={PERSON_COLOR}
        strokeWidth={RING_WIDTH}
      />
      <circle cx={CENTRE} cy={HEAD_CENTRE_Y} r={HEAD_RADIUS} fill={SEA_COLOR} />
      <path ref={landRef} d={landPath(GLOBE_FACING.longitude)} fill={LAND_COLOR} />
    </svg>
  )
}
