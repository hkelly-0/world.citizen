import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BackButton } from '../../shared/BackButton'
import { QUESTION_IDS } from '../flashcards/deck'
import { areCountryGroupsShown } from '../dev/showCountryGroups'
import {
  ALL_GROUP_IDS,
  COUNTRY_SHAPES,
  createCountryMap,
  findTappedCountryIndex,
  flyToCountry,
  flyToGroup,
  groupIdOfCountry,
  resumeHoverHighlight,
  setGroupFeatureState,
  setGroupTintShown,
  stopHoverHighlight,
} from './countryMap'
import { CountryInfoPanel } from './CountryInfoPanel'
import { CountrySearch } from './CountrySearch'
import { GlobeSettings } from './GlobeSettings'
import { RegionInfoPanel } from './RegionInfoPanel'
import { searchPlacesFromShapes } from './countryNameSearch'
import './GlobeView.css'

// The open info panel has its own browser history entry (on top of the globe
// screen's), so back closes the panel before leaving the globe.
function isPanelOpenInHistory(): boolean {
  return history.state?.panelOpen === true
}

// With Show Regions on (in the globe settings), every country is tinted in its
// region's (country group's) colour, and hovering, tapping or searching for a
// country highlights and selects its whole region instead. A selected region
// gets its own info panel, which also uses the panel's history entry.

// When a country is selected the globe turns to centre its main landmass in
// the space not covered by the back button and info panel, and zooms to a
// level set by the country's width and the screen width (focusZoom.ts). The padding is in pixels.
const FOCUS_PADDING = 24
const FOCUS_TOP_PADDING = 72
const FOCUS_DURATION_MS = 1200
// The panel's bottom margin, plus a gap above it.
const PANEL_BOTTOM_MARGIN = 16

// Every country and territory on the map, for the search box.
const SEARCH_PLACES = searchPlacesFromShapes(COUNTRY_SHAPES)

type GlobeViewProps = {
  onBack: () => void
}

export default function GlobeView({ onBack }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  // Index into COUNTRY_SHAPES, or null when no country is selected.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // The selected region's group id, or null. Only one of the selected country
  // and region is set at a time.
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isShowingRegions, setIsShowingRegions] = useState(false)
  // The same, for the map's event handlers, which are set up only once.
  const isShowingRegionsRef = useRef(false)
  // The region under the pointer while Show Regions is on. Kept outside React
  // state: hover changes often and only affects the map.
  const hoveredGroupIdRef = useRef<string | null>(null)
  // The map's current zoom level, shown for debugging on the dev server only.
  const [zoom, setZoom] = useState<number | null>(null)

  // Opening the panel adds its history entry; tapping another country (or
  // region) while it's open just swaps what the panel shows.
  function openPanelInHistory() {
    if (!isPanelOpenInHistory()) {
      history.pushState({ ...history.state, panelOpen: true }, '')
    }
  }

  function selectCountry(index: number) {
    openPanelInHistory()
    setSelectedGroupId(null)
    setSelectedIndex(index)
  }

  function selectRegion(groupId: string) {
    openPanelInHistory()
    setSelectedIndex(null)
    setSelectedGroupId(groupId)
  }

  // A tapped or searched-for country selects itself, or its region while Show
  // Regions is on. Map areas outside the 195 have no region, so with Show
  // Regions on they close the panel when tapped and do nothing when searched for.
  function selectCountryOrRegion(index: number, isTap: boolean) {
    if (!isShowingRegionsRef.current) {
      selectCountry(index)
      return
    }
    const groupId = groupIdOfCountry(index)
    if (groupId !== null) selectRegion(groupId)
    else if (isTap) closePanel()
  }

  // Highlights the whole region under the pointer, while Show Regions is on.
  function setHoveredGroup(groupId: string | null) {
    const map = mapRef.current
    if (map === null) return
    const hoveredId = hoveredGroupIdRef.current
    if (hoveredId !== null) setGroupFeatureState(map, hoveredId, { groupHovered: false })
    if (groupId !== null) setGroupFeatureState(map, groupId, { groupHovered: true })
    hoveredGroupIdRef.current = groupId
    map.getCanvas().style.cursor = groupId === null ? '' : 'pointer'
  }

  // Switches the map between highlighting countries and regions. The dev
  // option's tint stays on even with Show Regions off.
  function setRegionsShown(shown: boolean) {
    setIsShowingRegions(shown)
    isShowingRegionsRef.current = shown
    const map = mapRef.current
    if (map === null) return
    setGroupTintShown(map, shown || areCountryGroupsShown())
    setHoveredGroup(null)
    if (shown) stopHoverHighlight(map)
    else resumeHoverHighlight(map)
  }

  // Flipping the switch keeps what it can of the selection: a selected
  // country becomes its region, but a selected region has no single country
  // to go back to, so its panel closes.
  function changeShowRegions(shown: boolean) {
    setRegionsShown(shown)
    if (shown && selectedIndex !== null) {
      const groupId = groupIdOfCountry(selectedIndex)
      if (groupId === null) closePanel()
      else selectRegion(groupId)
    } else if (!shown && selectedGroupId !== null) {
      closePanel()
    }
  }

  // Clicking a country's name in a region's panel turns Show Regions off and
  // selects that country, keeping the panel's history entry.
  function selectCountryFromRegion(index: number) {
    setRegionsShown(false)
    selectCountry(index)
  }

  // Clicking a country's name in a territory's info panel works like tapping
  // it on the globe, as does choosing a place in the search box.
  function selectCountryByCode(isoAlpha3: string) {
    const index = COUNTRY_SHAPES.findIndex((shape) => shape.isoAlpha3 === isoAlpha3)
    if (index !== -1) selectCountry(index)
  }

  // Going back fires 'popstate', which clears the selection (below).
  function closePanel() {
    if (isPanelOpenInHistory()) history.back()
  }

  // With the panel open, its history entry is skipped too.
  function goToMenu() {
    if (isPanelOpenInHistory()) history.go(-2)
    else onBack()
  }

  // Back (browser or Android) from the panel's entry closes the panel.
  useEffect(() => {
    const closePanelIfLeft = () => {
      if (!isPanelOpenInHistory()) {
        setSelectedIndex(null)
        setSelectedGroupId(null)
      }
    }
    window.addEventListener('popstate', closePanelIfLeft)
    return () => window.removeEventListener('popstate', closePanelIfLeft)
  }, [])

  // Create the map once, when the component mounts.
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    // Every region can be tinted, but the tint starts hidden (Show Regions
    // starts off) unless the dev option is on.
    const map = createCountryMap(container, ALL_GROUP_IDS, areCountryGroupsShown())
    mapRef.current = map

    // Tapping a country selects it (or its region); tapping the ocean closes
    // the info panel.
    map.on('click', (event) => {
      const index = findTappedCountryIndex(map, event.point)
      if (index === null) closePanel()
      else selectCountryOrRegion(index, true)
    })

    // Mouse events only come from devices that can hover. Single countries
    // are highlighted by createCountryMap, so this only handles regions.
    map.on('mousemove', (event) => {
      if (!isShowingRegionsRef.current) return
      const index = findTappedCountryIndex(map, event.point)
      const groupId = index === null ? null : groupIdOfCountry(index)
      if (groupId !== hoveredGroupIdRef.current) setHoveredGroup(groupId)
    })
    map.on('mouseout', () => {
      if (isShowingRegionsRef.current) setHoveredGroup(null)
    })

    if (import.meta.env.DEV) {
      setZoom(map.getZoom())
      map.on('zoom', () => setZoom(map.getZoom()))
    }

    return () => {
      map.remove()
      mapRef.current = null
      hoveredGroupIdRef.current = null
    }
  }, [])

  // Highlight the selected country, and un-highlight it when the selection changes.
  useEffect(() => {
    if (selectedIndex === null) return
    mapRef.current?.setFeatureState({ source: 'countries', id: selectedIndex }, { selected: true })

    return () => {
      // The map may already be removed if the whole view is unmounting.
      mapRef.current?.setFeatureState(
        { source: 'countries', id: selectedIndex },
        { selected: false },
      )
    }
  }, [selectedIndex])

  // The space at the bottom of the map taken by the open panel, in pixels. The
  // panel must already be on screen, so it can be measured.
  function panelBottomPadding(map: MapLibreMap): number {
    const mapHeight = map.getContainer().clientHeight
    const panel = panelRef.current
    let panelHeight = panel?.offsetHeight ?? 0
    // The flag sits just above the panel, outside it, so add the space it takes.
    const flag = panel?.querySelector('.country-info-panel__flag')
    if (panel && flag) {
      panelHeight += panel.getBoundingClientRect().top - flag.getBoundingClientRect().top
    }
    // On a short screen the panel could leave no room, so it gets at most 40%.
    return Math.min(panelHeight + PANEL_BOTTOM_MARGIN + FOCUS_PADDING, mapHeight * 0.4)
  }

  // Turn and zoom the globe to the selected country.
  useEffect(() => {
    const map = mapRef.current
    if (selectedIndex === null || map === null) return
    flyToCountry(map, selectedIndex, FOCUS_TOP_PADDING, panelBottomPadding(map), FOCUS_DURATION_MS)
  }, [selectedIndex])

  // Highlight the selected region, un-highlight it when the selection changes,
  // and fly to it.
  useEffect(() => {
    const map = mapRef.current
    if (selectedGroupId === null || map === null) return
    setGroupFeatureState(map, selectedGroupId, { groupSelected: true })
    flyToGroup(
      map,
      selectedGroupId,
      FOCUS_TOP_PADDING,
      panelBottomPadding(map),
      FOCUS_PADDING,
      FOCUS_DURATION_MS,
    )

    return () => {
      // The map may already be removed if the whole view is unmounting.
      if (mapRef.current !== null) {
        setGroupFeatureState(mapRef.current, selectedGroupId, { groupSelected: false })
      }
    }
  }, [selectedGroupId])

  const selectedCountry = selectedIndex === null ? null : COUNTRY_SHAPES[selectedIndex]

  return (
    <div className="globe-view">
      <div className="globe-view__canvas" ref={containerRef} />
      <BackButton onClick={goToMenu} />
      <GlobeSettings isShowingRegions={isShowingRegions} onShowRegionsChange={changeShowRegions} />
      <CountrySearch
        places={SEARCH_PLACES}
        onSelect={(index) => selectCountryOrRegion(index, false)}
      />
      {selectedCountry !== null && (
        <CountryInfoPanel
          country={selectedCountry}
          // The globe is for exploring, so it shows every fact and paragraph,
          // whatever is learned in Settings.
          learnedQuestionIds={QUESTION_IDS}
          onClose={closePanel}
          onSelectCountry={selectCountryByCode}
          showCountryInfo
          ref={panelRef}
        />
      )}
      {selectedGroupId !== null && (
        <RegionInfoPanel
          groupId={selectedGroupId}
          onClose={closePanel}
          onSelectCountry={selectCountryFromRegion}
          ref={panelRef}
        />
      )}
      {zoom !== null && <div className="globe-view__zoom">Zoom {zoom.toFixed(2)}</div>}
    </div>
  )
}
