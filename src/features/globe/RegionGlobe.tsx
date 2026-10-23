import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, PointLike } from 'maplibre-gl'
import type { DeckProgress } from '../flashcards/deck'
import { groupsToChoose, type GroupChoice } from '../passport/passport'
import {
  createCountryMap,
  findTappedCountryIndex,
  flyToGroup,
  groupIdOfCountry,
  setGroupFeatureState,
  stopHoverHighlight,
} from './countryMap'
import './CountryInfoPanel.css'
import './RegionGlobe.css'

// The chosen region is fitted into the space below the label and above the
// card. In pixels.
const LABEL_SPACE_PX = 112
const SIDE_PADDING_PX = 24
const FLY_DURATION_MS = 1200
// The card's bottom margin, plus a gap above it.
const CARD_SPACE_PX = 40

type RegionGlobeProps = {
  // Decides which regions (country groups) can be chosen, and their counts.
  progress: DeckProgress
  // Called with the group id when "Discover this region →" is pressed.
  onDiscover: (groupId: string) => void
}

// A full-screen globe for choosing the next region (country group) to learn.
// Each group with countries not yet in the Passport is tinted in its colour;
// finished groups are left plain and can't be chosen. Hovering a country
// highlights its whole region; tapping it selects the region, flies to it and
// shows a card with its name, how many of its countries are seen, and
// "Discover this region →". Tapping elsewhere closes the card.
export default function RegionGlobe({ progress, onDiscover }: RegionGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  // Fixed while the globe is open: the map's tint is set when it is created.
  const [choices] = useState<GroupChoice[]>(() => groupsToChoose(progress))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Create the map once, when the component mounts.
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const choosableIds = choices.map((choice) => choice.id)
    const map = createCountryMap(container, choosableIds)
    mapRef.current = map
    // The whole region is highlighted instead of the single country.
    stopHoverHighlight(map)

    // The choosable region of the country at `point`, or null.
    function groupAt(point: PointLike): string | null {
      const index = findTappedCountryIndex(map, point)
      const groupId = index === null ? null : groupIdOfCountry(index)
      return groupId !== null && choosableIds.includes(groupId) ? groupId : null
    }

    // Kept outside React state: hover changes often and only affects the map.
    let hoveredId: string | null = null
    function setHovered(groupId: string | null) {
      if (hoveredId !== null) setGroupFeatureState(map, hoveredId, { groupHovered: false })
      if (groupId !== null) setGroupFeatureState(map, groupId, { groupHovered: true })
      hoveredId = groupId
      map.getCanvas().style.cursor = groupId === null ? '' : 'pointer'
    }

    // Mouse events only come from devices that can hover.
    map.on('mousemove', (event) => {
      const groupId = groupAt(event.point)
      if (groupId !== hoveredId) setHovered(groupId)
    })
    map.on('mouseout', () => setHovered(null))
    map.on('click', (event) => setSelectedId(groupAt(event.point)))

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [choices])

  // Highlight the selected region, un-highlight it when the selection changes,
  // and fly to it. The card is already on screen by now, so it can be measured.
  useEffect(() => {
    const map = mapRef.current
    if (selectedId === null || map === null) return
    setGroupFeatureState(map, selectedId, { groupSelected: true })
    const cardHeight = cardRef.current?.offsetHeight ?? 0
    // On a short screen the card could leave no room, so it gets at most 40%.
    const bottomPadding = Math.min(
      cardHeight + CARD_SPACE_PX,
      map.getContainer().clientHeight * 0.4,
    )
    flyToGroup(map, selectedId, LABEL_SPACE_PX, bottomPadding, SIDE_PADDING_PX, FLY_DURATION_MS)

    return () => {
      // The map may already be removed if the whole view is unmounting.
      if (mapRef.current !== null) {
        setGroupFeatureState(mapRef.current, selectedId, { groupSelected: false })
      }
    }
  }, [selectedId])

  const selected = choices.find((choice) => choice.id === selectedId)

  return (
    <div className="region-globe">
      <div className="region-globe__canvas" ref={containerRef} />
      <p className="region-globe__label">Choose a region to discover</p>
      {selected !== undefined && (
        <aside className="country-info-panel" aria-label="Region details" ref={cardRef}>
          <button
            className="country-info-panel__close"
            onClick={() => setSelectedId(null)}
            aria-label="Close"
          >
            ×
          </button>
          <h2>{selected.name}</h2>
          <p className="country-info-panel__note">
            {selected.seenCount} / {selected.size} countries
          </p>
          <button className="region-globe__discover" onClick={() => onDiscover(selected.id)}>
            Discover this region →
          </button>
        </aside>
      )}
    </div>
  )
}
