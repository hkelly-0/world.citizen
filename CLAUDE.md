# Claude Behaviour

Do not make assumptions: if my instructions are unclear, ask me as many clarifying questions as required to remove all ambiguity. Use your AskUserQuestion tool.

This code should be explicit to the reader. Do not use complex engineering patterns when simple ones will suffice, unless I explicitly ask for modular or scalable solutions.

While working, do not remove previous comments unless the underlying logic changes and the comment is incorrect.

## Updating CLAUDE.md

CLAUDE.md is for what can't be learned quickly from the code: decisions and why, constraints, gotchas, commands, data sources, and open work. When a change needs it updated:
- Name the file, function or constant instead of copying its value (e.g. `FAMILIARITY_DAYS_AHEAD`, not "14 days"). Leave out exact numbers, UI wording and step-by-step behaviour; put those details in code comments.
- Keep each feature to a few sentences: what it does, where it lives, and rules that are easy to break.
- Don't record finished work; git history covers it. Remove Status items once they're done.
- Prefer editing or replacing existing text over adding to it.

## Git

- Make one commit per logical change (e.g. a bug fix and a refactor are separate commits); don't bundle unrelated updates.
- Commit subject: imperative mood, ≤72 characters, no trailing period (e.g. "Add .gitignore for Python bytecode"). Add a body when the *why* isn't obvious.
- Run the tests before committing code changes.
- Only commit when asked.

# Geography Learning App

A geography learning app shipped as **both an Android APK and a website** with identical behaviour, built from a single web codebase.

Audience: friends and family; the APK is sideloaded (no Play Store).

## Features
The code is the source of truth for exact numbers and wording; this is an overview.

The app opens on a main menu (Flashcards, Globe, Passport, Settings). Screens are switched with React state in `src/App.tsx` (no URL routing). Each screen, and the globe's open info panel, pushes a browser history entry with the same URL so back (browser, or Android via `@capacitor/app` in `src/main.tsx`) steps back through them; on Android, back from the main menu closes the app.

Features link up via ISO alpha-3 country codes. Scope: the 195 countries (193 UN members + Vatican and Palestine).

1. **Flashcards** (`src/features/flashcards/`) – one card per country, with five questions in order: globe, area, population, IHDI, capital.
   - The globe question is either "Locate country on globe" (`LocateCountryGlobe.tsx`) or "Name country from globe" (`NameCountryGlobe.tsx`), a coin flip each time. They share one FSRS schedule.
   - Area, population and IHDI are answered by picking a named range (see Data); capital and country name are typed. Typed answers ignore case, accents and surrounding spaces, with no fuzzy matching. Names also accept the official name and `countryNameAlternatives.json`.
   - The flashcards menu offers **Classic** (all questions learned in Settings) and **Custom Practice** (`CustomPracticeMenu.tsx`: tick which question types to practise today). Only the practised questions decide which countries are due and are reviewed; the others keep their schedules. Custom Practice only shows countries already in the Passport (`canDiscoverCountries` in `FlashcardsView.tsx`), though one can still be asked a question for the first time; new countries are discovered in Classic or the Passport's "New country" card.
   - New countries are learned one country group at a time (`countryGroups.json`, see Data). The user picks a group from a dropdown (`GroupChooser.tsx`, shared by Classic and the Passport). It is saved (`src/shared/learningGroup.ts`) and stays pending until all its countries are in the Passport; `pendingGroupId` in `passport.ts` works this out from progress, so a group finished anywhere is done. Classic asks for a group only when nothing is due and none is pending.
   - Scheduling: FSRS via `ts-fsrs` (`fsrs.ts`), one schedule per question. Whole days only, fuzz on, default parameters. Right = Good, wrong = Again (always due tomorrow), a range pick one title off = Hard (`rangeAnswerResult` in `rangeQuestions.ts`). A card is due when its earliest practised question is (`countryDueDate` in `deck.ts`); finishing a card reviews all its practised questions. Due countries come first (most overdue first), then the pending group's unseen ones in random order.
   - Before a new country or the group dropdown (so never in Custom Practice), if the average familiarity of countries already seen is too low (`isTooUnfamiliarForNewCountry` in `passport.ts`), a warning replaces the card with a button to continue anyway. Otherwise, a country not yet in the Passport gets a "Discovering a new country" screen before its card (skipped right after continuing past the warning).
   - Every finished card, in any mode, is followed by a reward (`CardReward.tsx`, chosen by `rewardAfterCard`): for a new country's first card the Passport count rolling up by one, otherwise the country's familiarity ring filling from empty. The ring always covers the questions learned in Settings, so it matches the Passport even in Custom Practice.
   - Every answer is logged (`src/shared/reviewLog.ts`) for tuning FSRS later; nothing reads it yet. Old SM-2 progress is deleted on load (`removeOldSm2Progress` in `progress.ts`).
2. **Globe** (`src/features/globe/`) – spin and zoom a satellite globe; tap a country (or find it with the search box, `CountrySearch.tsx`) to open an info panel.
   - Selecting a country centres its main landmass (`mainLandmass.ts`) and zooms by its width (`focusZoom.ts`, with hand-picked zooms for Russia and Canada). The flashcard globes reuse this.
   - Zooms are corrected for latitude (`latitudeZoom.ts`), as MapLibre enlarges the globe near the poles; both globes' zoom limits are in `zoomLimits.ts`. Screens 768 px or wider zoom in further.
   - Countries under 1,000 km² get a tap buffer of a few screen pixels (`tapBuffer.ts`, via `findTappedCountryIndex` in `countryMap.ts`), used for hover too.
3. **Settings** (`src/features/settings/`, stored by `src/shared/settings.ts`) – the root control for what is learned (Location, Area, Population, IHDI, Capital). Unticked information isn't shown on the info panel, asked in Classic or offered in Custom Practice; its FSRS schedules are kept.
4. **Passport** (`src/features/passport/`) – a grid of the countries the user has seen as flashcards (any question answered). Tapping one enlarges it with a "Play flashcard →" button that opens its card (`PassportFlashcardView.tsx`, always the locate globe question). A trailing "New country" card plays a random unseen country of the pending group (`randomUnseenCountryInGroup`), or first shows the group dropdown.
   - Familiarity (`countryRecall` in `passport.ts`): the average FSRS chance of remembering the country's answered, learned questions `FAMILIARITY_DAYS_AHEAD` days from now (on the day of a review it is always ~100%). Shown as a ring (`RecallCircle.tsx`), used by the Familiarity sort and by the new-country warning.
   - Sort choice is remembered (`src/shared/passportSort.ts`); discovery times for Date discovered are saved in `src/shared/discoveries.ts`.
5. **Dev menu** (`src/features/dev/`) – on the dev server only (`import.meta.env.DEV`), a "dev" tab on the right edge of every screen (`DevTools.tsx`, rendered in `App.tsx`) opens buttons that edit saved progress to set up flashcard situations: skip days, add well-known/shaky countries, make everything or nothing due, reset (logic in `devProgress.ts`). After each change the current screen is remounted so it reads the new progress.
   - "Show country groups on globes" tints every globe by country group (`countryGroupColours.ts`, an extra layer in `countryMap.ts`). Not saved; globes read it when created. Colours are picked per page load, keeping neighbouring groups' hues apart.

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor** (`capacitor.config.ts`, native project in `android/`).
  - App ID `world.citizen` (must never change, or installed apps can't be updated); app name `world.citizen`.
  - `npm run android:sync` builds the web app and copies it into `android/` (the copy is gitignored). Then build/run from Android Studio (`npx cap open android`), or `cd android && ./gradlew assembleDebug` with `JAVA_HOME` set to a Java 21 JDK, e.g. `~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home` (the project targets Java 21; Android Studio's bundled JDK is 25, which Gradle 8.14 doesn't support).
- **Build tool:** Vite. Requires npm 11+ (developed on Node 24 / npm 11.19.1); npm 10.9.2 crashes resolving Vitest 5's peer dependencies, so on npm 10 install with `npx npm@11 install`.
- **UI framework:** React, written in TypeScript.
- **Styling:** plain CSS files, one per component, imported directly. Colours shared across components are CSS variables on `:root` in `src/index.css`. The whole app uses Roboto Mono (`@fontsource/roboto-mono`); it lacks ← and ≥, which fall back to the system's monospace font.
- **Formatting and linting:** Prettier (`npm run format`, config in `.prettierrc.json`) and oxlint (`npm run lint`). A pre-commit hook (husky + lint-staged, `.husky/pre-commit`) formats staged files; `npm install` sets it up.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL map itself is not unit-tested.
- **Globe:** MapLibre GL JS (`src/features/globe/countryMap.ts` creates the map for every globe). A globe projection when zoomed out, blending into flat Mercator between zoom 4 and 5. Borders are a GeoJSON source that MapLibre tiles and simplifies per zoom; taps use `queryRenderedFeatures`, highlights use feature state (no data rebuilds).
  - MapLibre's worker script is copied by Vite (`?url` import) and passed to `setWorkerUrl`, because MapLibre can't find it after bundling.
  - Alternatives considered: `globe.gl` (tried first; too slow on phones because every country is a separate 3D mesh, and blurry/blocky when zoomed in), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all country data bundled with the app, no runtime network dependency.
- **Storage:** local only, in localStorage (`src/shared/`: progress, settings, discoveries, passport sort, review log, chosen country group); could move to Capacitor Preferences on Android if WebView storage proves unreliable. A backend only if accounts or sync are added later.
- **Optional:** also ship the website as a PWA.

## Performance guidelines (Android WebView)
- Let MapLibre handle level of detail: pass full-detail borders and tiled imagery, not single large images or pre-simplified geometry.
- Cap the device pixel ratio: 1.5 on touch devices, 2 otherwise.
- Only set up hover handling on devices that can hover.
- Lazy-load the globe screen, and the flashcards' location and name globes, so the rest of the flashcards stay fast.

## Data
Generated files are committed; each script lists its download links.

- Borders: Natural Earth 1:50m TopoJSON from `world-atlas` (`countries-50m.json`), ISO numeric IDs converted to alpha-3 with `i18n-iso-countries`. A few areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code.
  - 50m leaves out Tuvalu, so its outline comes from 1:10m: `node scripts/make-tuvalu-outline.mjs` writes `src/data/tuvaluOutline.json`, appended in `src/shared/countries.ts`.
  - Russia, Fiji and Antarctica cross the 180° meridian or surround the South Pole; `flatMapGeometry.ts` converts them for MapLibre's flat tiles.
- Background imagery: NASA Blue Marble Next Generation (June 2004, public domain) as WebP tiles for zooms 0–6 in `public/tiles/satellite/` (~30 MB). Regenerate with `scripts/make-background-tiles.sh <source-folder>` (needs GDAL). Imagery stops gaining detail around zoom 5; borders keep going to about zoom 8.
- Named ranges (`src/shared/statRanges.ts`): population, area and IHDI are only ever shown and asked as range titles, never exact numbers. Each range starts at its `min`, inclusive; IHDI titles are IHDI × 10, rounded half up.
- Country pictures: `public/country-images/{ISO}.webp`, made by `node scripts/make-country-images.mjs [codes...]` (all if no codes). Each looks down on the country's main landmass.
  - Main landmass (`mainLandmass.ts`, the one copy of the rule, also used by the globes): the largest part plus nearby parts, with exceptions as boxes in `src/data/mainLandmassOverrides.json` (east may exceed 180 across the antimeridian). After editing an override, regenerate that country's picture.
- App icon: `node scripts/make-app-icon.mjs` writes the Android mipmaps and `public/favicon.svg` + `public/apple-touch-icon.png`.
- `src/data/countries.json` – facts for the 195 countries (typed as `CountryFacts` in `countryFacts.ts`), made by `node scripts/make-country-data.mjs <source-folder>`.
  - Names, capitals and area: mledoze/countries (a few missing second capitals are added in the script). Population: UN WPP 2024, 2025 medium-variant projection. HDI and IHDI: UNDP HDR 2025, latest year per country.
  - `ihdiEstimate`: for countries with an HDI but no IHDI, a least-squares line fitted on countries with both. Kept apart from `ihdi` so real and estimated values never mix; marked "(est.)" / "Estimated" in the UI.
  - `groupId` / `groupName`: each country's group from the hand-written `src/data/countryGroups.json`, a partition of the 195 into groups of 3 to 5 similar neighbours (the script throws if a country is missing, repeated, or a group's size is off). Rename a group by its `name`; its `id` stays fixed (it is saved as the user's chosen group). `node scripts/make-country-groups-map.mjs` redraws `docs/country-groups.png` for checking them by eye.
- `src/data/countryNameAlternatives.json` – hand-written other names (e.g. `"TUR": ["Turkey"]`), read with `alternativeNames`; used by the name question and the search.
- `src/data/territorySubtitles.json` – hand-written description of each map area outside the 195, keyed by ISO code or, where there is none, the map's name. `{ISO}` in the text links to that country. Contested areas get neutral wording. To be reviewed by the owner.

## Status
- Not yet checked on a real phone: the location and name globe questions (in particular how the name question's bottom panel sits above the on-screen keyboard).
- Next: range boundaries page. Later for Android: release signing keystore (keep it backed up, never commit it).
- Todo: when the repo is on GitHub, add `.github/workflows/ci.yml` running `npm run lint`, `npx tsc -b`, `npm run format:check` and `npm test` on every push and pull request.
- Possible later: more facts (flag, region, languages, etc.).
- Todo: check the estimated IHDIs (`ihdiEstimate`) that may be wrong, then either hand-enter real values from other sources or skip their IHDI flashcard question. Likely too low: Turkmenistan, Uzbekistan (post-Soviet states come in above the line). Likely too high: Caribbean countries (Dominica, Grenada, St Vincent, St Kitts, Antigua, Cuba, Guyana, Suriname, Trinidad, Belize) and Equatorial Guinea. Within 0.01 of a title boundary: Guyana, Micronesia, Liechtenstein, Kuwait, Antigua. Least doubtful: Qatar, Bahrain, Saudi Arabia, Eritrea, San Marino.
