import { geoOrthographic, geoPath } from 'd3-geo'
import type { MultiPolygon } from 'geojson'
import { useEffect, useRef } from 'react'
import logoLand from '../../data/logoLand.json' with { type: 'json' }

// The app icon (see scripts/make-app-icon.mjs) with its globe head spinning:
// the land is redrawn every frame as the globe turns west to east. The shapes,
// sizes and colours are the same as in that script, which draws the still
// icons; change both together.

const BACKGROUND_COLOR = '#000010'
const PERSON_COLOR = '#88ddff'
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

// Where the globe faces when the menu opens (and stays, if the device asks for
// reduced motion): between North and South America, a little east of the still
// icon's view.
const GLOBE_FACING = { longitude: -60, latitude: 8 }
// How long one full turn of the globe takes.
const SECONDS_PER_TURN = 25
// The most times a second the land is redrawn. At the logo's size it moves a
// few pixels a second, so this still looks smooth, while saving the phone the
// work of redrawing every frame.
const MAX_REDRAWS_PER_SECOND = 30
// Decimal places for coordinates in the land's SVG path, to keep it short.
const PATH_DIGITS = 1

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

type SpinningLogoProps = {
  className?: string
}

export function SpinningLogo({ className }: SpinningLogoProps) {
  const landRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) {
      return
    }
    let frame = 0
    let startTime: number | null = null
    let lastDrawTime = -Infinity

    function drawFrame(time: number) {
      frame = requestAnimationFrame(drawFrame)
      if (startTime === null) {
        startTime = time
      }
      if (time - lastDrawTime < 1000 / MAX_REDRAWS_PER_SECOND) {
        return
      }
      lastDrawTime = time
      // Worked out from the time since the start rather than added per frame,
      // so the speed is the same however often frames come. Turning west to
      // east moves the land rightwards, bringing in land from further west, so
      // the longitude facing the viewer decreases.
      const turns = (time - startTime) / 1000 / SECONDS_PER_TURN
      const facingLongitude = GLOBE_FACING.longitude - (turns % 1) * 360
      landRef.current?.setAttribute('d', landPath(facingLongitude))
    }

    frame = requestAnimationFrame(drawFrame)
    return () => cancelAnimationFrame(frame)
  }, [])

  const viewBoxStart = CENTRE - RING_OUTER_RADIUS
  const viewBoxSize = 2 * RING_OUTER_RADIUS
  return (
    // Decorative, as the title below it names the app.
    <svg
      className={className}
      viewBox={`${viewBoxStart} ${viewBoxStart} ${viewBoxSize} ${viewBoxSize}`}
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
