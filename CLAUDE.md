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
2. **Interactive globe** – spin and pinch-zoom a 3D globe, tap a country to open an info panel.

Features should link up via ISO country codes, e.g. "show on globe" from a flashcard, "add to flashcards" from the globe info panel.

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor**.
- **Build tool:** Vite.
- **UI framework:** React, written in TypeScript.
- **Styling:** plain CSS files, one per component, imported directly.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL globe itself is not unit-tested.
- **Globe:** `globe.gl` (three.js-based). Country polygons, rotate/zoom, `onPolygonClick` for selection.
  - Alternatives considered: MapLibre GL JS globe projection (if street-level zoom is ever needed), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all country data bundled with the app, no runtime network dependency.
- **Progress storage:** local only to start (localStorage / IndexedDB or Capacitor Preferences). A backend (Supabase/Firebase) only if accounts or sync are added later.
- **Optional:** also ship the website as a PWA.

## Data
- Borders: Natural Earth 1:50m TopoJSON from the `world-atlas` npm package (`world-atlas/countries-50m.json`). Countries carry ISO numeric IDs, converted to alpha-3 with `i18n-iso-countries`. A few areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code.
- Globe texture: NASA Blue Marble (public domain), bundled at `public/textures/earth-blue-marble.jpg`.
- `src/data/countries.json` – country facts keyed by ISO code, generated once from a source like REST Countries and committed.

## Proposed structure
```
src/
  data/
    countries.json
  features/
    globe/          # globe view, selection, info panel
    flashcards/     # deck logic, card UI, spaced repetition
  shared/
    countries.ts    # country outlines + ISO codes from world-atlas
    CountryInfo     # shared by globe panel and flashcards
    progress        # local persistence of learning progress
```

## Performance guidelines (Android WebView)
- Use simplified borders, not high-resolution geometry.
- Cap the WebGL renderer's device pixel ratio at about 2.
- Lazy-load the globe screen so flashcards stay fast.

## Status
- Done: web scaffold with a clickable globe. Tapping a country shows its name and ISO codes; tapping the ocean closes the panel.
- Next: flashcard design details, the country facts dataset, then Capacitor/Android (needs Android Studio and SDK, not yet installed).
- Note: requires npm 11+ (developed on Node 24 / npm 11.19.1). npm 10.9.2 crashes resolving Vitest 5's peer dependencies; on npm 10, install with `npx npm@11 install`.
