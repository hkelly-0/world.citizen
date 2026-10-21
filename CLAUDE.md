## Behaviour

Do not make assumptions: if my instructions are unclear, ask me as many clarifying questions as required to remove all ambiguity.

This code should be explicit to the reader. Do not use complex engineering patterns when simple ones will suffice, unless I explicitly ask for modular or scalable solutions.

While working, do not remove previous comments unless the underlying logic changes and the comment is incorrect.

## Git

- Make one commit per logical change (e.g. a bug fix and a refactor are separate commits); don't bundle unrelated updates.
- Commit subject: imperative mood, ≤72 characters, no trailing period (e.g. "Add .gitignore for Python bytecode"). Add a body when the *why* isn't obvious.
- Run the tests before committing code changes.
- Only commit when asked.

# Geography Learning App

A geography learning app shipped as **both an Android APK and a website** with identical behaviour, built from a single web codebase.

Audience: friends and family; the APK is sideloaded (no Play Store).

## Features
1. **Flashcards** – learn facts about countries (capital, flag, population, region, languages, etc.), with locally saved progress.
   - Scope: 193 UN members + 2 observers (Vatican, Palestine).
   - Answers mostly by drop-down or typed text; no fuzzy matching for now.
   - Scheduling: SM-2 (Anki-style).
   - Remaining details (card types, drop-down style, SM-2 grading) still to be decided.
2. **Interactive globe** – spin and pinch-zoom a 3D globe with satellite imagery, which flattens into a map when zoomed in; tap a country to open an info panel.

Features should link up via ISO country codes, e.g. "show on globe" from a flashcard, "add to flashcards" from the globe info panel.

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor**.
- **Build tool:** Vite.
- **UI framework:** React, written in TypeScript.
- **Styling:** plain CSS files, one per component, imported directly.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL map itself is not unit-tested.
- **Globe:** MapLibre GL JS (`src/features/globe/GlobeView.tsx`). Its projection is a globe when zoomed out and blends into a flat Mercator map between zoom 4 and 5. Borders are a GeoJSON source that MapLibre tiles and simplifies per zoom level; tapped countries are found with `queryRenderedFeatures`, and hover/selection highlights use feature state (no data rebuilds).
  - MapLibre's worker script is copied by Vite (`?url` import) and passed to `setWorkerUrl`, because MapLibre can't find it after bundling.
  - Alternatives considered: `globe.gl` (tried first; too slow on phones because every country is a separate 3D mesh, and blurry/blocky when zoomed in), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all country data bundled with the app, no runtime network dependency.
- **Progress storage:** local only to start (localStorage / IndexedDB or Capacitor Preferences). A backend (Supabase/Firebase) only if accounts or sync are added later.
- **Optional:** also ship the website as a PWA.

## Data
- Borders: Natural Earth 1:50m TopoJSON from the `world-atlas` npm package (`world-atlas/countries-50m.json`). Countries carry ISO numeric IDs, converted to alpha-3 with `i18n-iso-countries`. A few areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code.
  - world-atlas stores Russia, Fiji and Antarctica as single shapes across the 180° meridian or around the South Pole; `src/features/globe/flatMapGeometry.ts` converts them so MapLibre's flat tiles draw them correctly.
- Background imagery: NASA Blue Marble Next Generation, June 2004, 21600×10800 (public domain), cut into WebP map tiles for zoom levels 0–6 at `public/tiles/satellite/` (~30 MB). Regenerate with `scripts/make-background-tiles.sh <source-folder>` (needs GDAL: `brew install gdal`); the script lists the download link.
  - The imagery stops gaining detail around map zoom 5; borders keep gaining detail to about zoom 8.
- `src/data/countries.json` – country facts keyed by ISO code, generated once from a source like REST Countries and committed.

## Proposed structure
```
src/
  data/
    countries.json
  features/
    globe/          # MapLibre globe/map view, selection, info panel, flat-map geometry fixes
    flashcards/     # deck logic, card UI, spaced repetition
  shared/
    countries.ts    # country outlines + ISO codes from world-atlas
    CountryInfo     # shared by globe panel and flashcards
    progress        # local persistence of learning progress
scripts/            # one-off asset generation (background map tiles)
```

## Performance guidelines (Android WebView)
- Let MapLibre handle level of detail: pass full-detail borders and tiled imagery, not single large images or pre-simplified geometry.
- Cap the device pixel ratio: 1.5 on touch devices, 2 otherwise.
- Only set up hover handling on devices that can hover.
- Lazy-load the globe screen so flashcards stay fast.

## Status
- Done: MapLibre globe with satellite imagery that flattens into a map when zoomed in. Tapping a country highlights it and shows its name and ISO codes; tapping the ocean closes the panel.
- Next: flashcard design details, the country facts dataset, then Capacitor/Android (needs Android Studio and SDK, not yet installed).
- Note: requires npm 11+ (developed on Node 24 / npm 11.19.1). npm 10.9.2 crashes resolving Vitest 5's peer dependencies; on npm 10, install with `npx npm@11 install`.
