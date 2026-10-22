# Claude Behaviour

Do not make assumptions: if my instructions are unclear, ask me as many clarifying questions as required to remove all ambiguity. Use your AskUserQuestion tool.

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
The app opens on a main menu (Globe, Flashcards); each screen has a "← Menu" back button. Screens are switched with React state in `src/App.tsx` (no URL routing). Each screen, and the globe's open info panel, adds a browser history entry with the same URL, so back (browser, or Android via `@capacitor/app` in `src/main.tsx`) closes the panel, then returns to the menu; on Android, back from the menu closes the app.

1. **Flashcards** – learn facts about countries, with locally saved progress.
   - Scope: 193 UN members + 2 observers (Vatican, Palestine).
   - One card per country, showing its picture and common name. Questions in order: location, area, population, IHDI (tap one range-title button; IHDI also offers "No data"), then capital (typed; the "Reveal" button works even with nothing typed, which counts as wrong). Each answer is revealed (correct option green, wrong pick red) before a "Next" button.
   - Location question: a full-screen globe (`LocateCountryGlobe.tsx`) with "Select Finland" over it. The user spins and zooms, then taps a country. Tapping the ocean does nothing; tapping any land is the answer (areas outside the 195, e.g. Greenland, are wrong). The tapped country turns green or red; if wrong, its name fades in in red in the middle of the screen, then fades out as the correct country turns green. Either way the globe then flies to the correct country (same centre and zoom as tapping a country on the globe screen) and lingers there for 1.5 s. Then the globe fades to reveal the card, with no result text. Tuvalu has no outline to tap, so its card skips this question.
   - After any answer there is no "Correct"/"Wrong" text: range options are coloured, and for the capital the text box turns green with green text if right, or the typed text fades red and the correct capital is typed out in green beside it. Capital check ignores case, accents and surrounding spaces; spelling must otherwise be exact (no fuzzy matching). Any one of several capitals counts.
   - Scheduling: SM-2 (Anki-style). Grade from the number correct out of 5: 5 → 5, 4 → 4, 3 → 3, 2 → 2, 0–1 → 0 (below 3 fails; a failed card is due tomorrow). Tuvalu's card has 4 questions: 4 → 5, 3 → 4, 2 → 2, 0–1 → 0. Due reviews come first (most overdue first), then unseen countries in random order, with no daily limit on new cards.
   - Possible later additions: more facts (flag, region, languages, etc.).
2. **Interactive globe** – spin and pinch-zoom a 3D globe with satellite imagery, which flattens into a map when zoomed in; tap a country to open an info panel; the globe turns to centre the country's main landmass in the space above the panel (`mainLandmass.ts`; see Data → Country pictures) and zooms by its width (`focusZoom.ts`): countries up to ~320 km across (São Tomé and Príncipe) go to zoom 4.1, and wider ones zoom out 0.41 per extra 1000 km (Ivory Coast ~3.9, India ~2.3, China ~1.9, Canada ~1.6), stopping at 1.25 (Russia). When the globe is 768 px or wider (laptops) it zooms in further: tiny countries 4.3, then 0.314 per extra 1000 km (USA ~2.7, China ~2.6, Russia ~1.7).

Both globes limit zoom (`zoomLimits.ts`): at the equator the minimum is 1.3 on phones and 1.8 when the globe is 768 px or wider, and the maximum is 6. MapLibre draws the globe larger near the poles (by 1/cos(latitude)) and already lowers the minimum zoom to match, so the minimum is passed unchanged and the zoomed-out globe is the same size everywhere. The maximum is lowered by log2(1/cos(latitude)) (capped at 80°) here.

Features should link up via ISO country codes, e.g. "show on globe" from a flashcard, "add to flashcards" from the globe info panel.

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor** (`capacitor.config.ts`, native project in `android/`).
  - App ID `world.citizen` (must never change, or installed apps can't be updated); app name `world.citizen`.
  - `npm run android:sync` builds the web app and copies it into `android/` (the copy is gitignored). Then build/run from Android Studio (`npx cap open android`), or `cd android && ./gradlew assembleDebug` with `JAVA_HOME` set to a Java 21 JDK, e.g. `~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home` (the project targets Java 21; Android Studio's bundled JDK is 25, which Gradle 8.14 doesn't support).
- **Build tool:** Vite.
- **UI framework:** React, written in TypeScript.
- **Styling:** plain CSS files, one per component, imported directly.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL map itself is not unit-tested.
- **Globe:** MapLibre GL JS (`src/features/globe/countryMap.ts` creates the map, shared by `GlobeView.tsx` and the flashcards' `LocateCountryGlobe.tsx`). Its projection is a globe when zoomed out and blends into a flat Mercator map between zoom 4 and 5. Borders are a GeoJSON source that MapLibre tiles and simplifies per zoom level; tapped countries are found with `queryRenderedFeatures`, and hover/selection highlights use feature state (no data rebuilds).
  - MapLibre's worker script is copied by Vite (`?url` import) and passed to `setWorkerUrl`, because MapLibre can't find it after bundling.
  - Alternatives considered: `globe.gl` (tried first; too slow on phones because every country is a separate 3D mesh, and blurry/blocky when zoomed in), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all country data bundled with the app, no runtime network dependency.
- **Progress storage:** local only, in localStorage (`src/shared/progress.ts`); could move to Capacitor Preferences on Android if WebView storage proves unreliable. A backend (Supabase/Firebase) only if accounts or sync are added later.
- **Optional:** also ship the website as a PWA.

## Data
- Borders: Natural Earth 1:50m TopoJSON from the `world-atlas` npm package (`world-atlas/countries-50m.json`). Countries carry ISO numeric IDs, converted to alpha-3 with `i18n-iso-countries`. A few areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code.
  - world-atlas stores Russia, Fiji and Antarctica as single shapes across the 180° meridian or around the South Pole; `src/features/globe/flatMapGeometry.ts` converts them so MapLibre's flat tiles draw them correctly.
- Background imagery: NASA Blue Marble Next Generation, June 2004, 21600×10800 (public domain), cut into WebP map tiles for zoom levels 0–6 at `public/tiles/satellite/` (~30 MB). Regenerate with `scripts/make-background-tiles.sh <source-folder>` (needs GDAL: `brew install gdal`); the script lists the download link.
  - The imagery stops gaining detail around map zoom 5; borders keep gaining detail to about zoom 8.
- Named ranges: population, area and IHDI are shown and asked as range titles with the range's lower bound (e.g. "Immense - ≥ 5M km²", "Multitudes - ≥ 100M", "Excellent - 9"; the lowest area/population range shows "< 10K km²" / "< 100K"), never exact numbers. Ranges are defined in `src/shared/statRanges.ts` (each starts at its `min`, inclusive). IHDI titles are the IHDI × 10, rounded half up. A page showing the range boundaries is planned.
- Country pictures: `public/country-images/{ISO}.webp`, 512×512, generated by `node scripts/make-country-images.mjs [codes...]` (all countries if no codes) and committed (~3 MB). Each looks straight down on the globe at the country's main landmass (far-off islands and territories are left out): the country textured with the Blue Marble tiles, other land faintly filled, all borders outlined, ocean transparent.
  - Main landmass (`src/features/globe/mainLandmass.ts`, the one copy of the rule, also used for the globe's zoom-to-country and the flashcard fly-to): the country's largest part plus parts near it. Exceptions are hand-written in `src/data/mainLandmassOverrides.json`, keyed by ISO alpha-3, e.g. `"USA": { "box": [-125, 24, -66, 50], "note": "Contiguous states only: leave out Alaska and Hawaii" }`. Every part whose centre is inside the box `[west, south, east, north]` counts (east may go above 180 for countries across the 180° meridian). After editing it, regenerate that country's picture; a test checks each box selects at least one part.
  - Countries 1000 km or more across fill 2/3 of the picture; smaller ones fill less, down to 1/2 at 100 km. Zoom is capped at 4× the tile resolution, and countries still under 20 px across (Monaco, Nauru, San Marino, Vatican) get a yellow ring.
  - Tuvalu has no picture (no outline in world-atlas).
- `src/data/countries.json` – facts for the 195 countries keyed by ISO alpha-3 (typed as `CountryFacts` in `src/shared/countryFacts.ts`), generated by `node scripts/make-country-data.mjs <source-folder>` and committed; the script lists the download links.
  - Common/official names, capitals and total area: mledoze/countries (the REST Countries dataset). A few second capitals it lacks are added by hand in the script.
  - Population: UN World Population Prospects 2024, medium-variant projection for 2025 (its estimates stop at 2023).
  - Inequality-adjusted HDI: UNDP Human Development Report 2025, latest year with a value per country. 26 countries (incl. Vatican) have none and show "no data".

## Structure
```
src/
  App.tsx           # switches between menu, globe and flashcards screens
  data/
    countries.json
  features/
    menu/           # main menu
    globe/          # shared map setup (countryMap.ts), globe screen, flashcard location globe, info panel, flat-map geometry fixes
    flashcards/     # SM-2 (sm2.ts), next-card choice (deck.ts), capital check, card UI
  shared/
    countries.ts    # country outlines + ISO codes from world-atlas
    countryFacts.ts # typed access to countries.json
    statRanges.ts   # named ranges for population, area and IHDI
    progress.ts     # flashcard progress in localStorage
    BackButton.tsx  # "← Menu" button used by each screen
scripts/            # one-off asset generation (background map tiles, country facts, country pictures)
android/            # Capacitor's native Android project (mostly generated)
```

## Performance guidelines (Android WebView)
- Let MapLibre handle level of detail: pass full-detail borders and tiled imagery, not single large images or pre-simplified geometry.
- Cap the device pixel ratio: 1.5 on touch devices, 2 otherwise.
- Only set up hover handling on devices that can hover.
- Lazy-load the globe screen, and the flashcards' location globe, so the rest of the flashcards stay fast.

## Status
- Done: MapLibre globe with satellite imagery that flattens into a map when zoomed in. Tapping a country highlights it and shows its facts (names, capitals, population, area, IHDI); tapping the ocean closes the panel. Tuvalu has no outline in world-atlas, so it cannot be tapped.
- Done: country facts dataset (`src/data/countries.json`), shown as named ranges.
- Done: main menu and flashcards with SM-2 scheduling and saved progress.
- Done: flashcard location question on the globe (`LocateCountryGlobe.tsx`); graded out of 5. Not yet checked on a real phone or emulator.
- Done: country pictures for 194 countries, shown on the flashcards.
- Done: Capacitor Android project; debug APK runs on the emulator (menu, globe and flashcards checked).
- Next: range boundaries page. Later for Android: release signing keystore (keep it backed up, never commit it), app icon.
- Note: requires npm 11+ (developed on Node 24 / npm 11.19.1). npm 10.9.2 crashes resolving Vitest 5's peer dependencies; on npm 10, install with `npx npm@11 install`.
