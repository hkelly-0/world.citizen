# Claude Behaviour

Do not make assumptions: if my instructions are unclear, ask me as many clarifying questions as required to remove all ambiguity. Use your AskUserQuestion tool.

Don't check visual results yourself (no browsers, screenshots or driving the app); I verify them on real devices.

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

A geography learning app shipped as **both an Android APK and a website** with identical behaviour, from one web codebase. Audience: friends and family; the APK is sideloaded (no Play Store).

## Features
The code is the source of truth; this lists where things live and the rules that are easy to break.

Screens are switched with React state in `src/App.tsx` (no URL routing); each screen and the globe's info panel push a same-URL history entry so back steps through them (Android back via `@capacitor/app` in `src/main.tsx`). Features link up via ISO alpha-3 codes. Scope: 197 countries (193 UN members + Vatican, Palestine, Taiwan and Kosovo).

1. **Flashcards** (`src/features/flashcards/`) – one card per country; Classic and Custom Practice modes.
   - Info question ids (`INFO_QUESTION_IDS`) are `CountryInfo`'s keys; they are saved, so never rename them.
   - The two globe questions (`LocateCountryGlobe.tsx`, `NameCountryGlobe.tsx`) share one FSRS progress.
   - Multi-country questions (`multiCountryQuestions.ts`) aren't `QuestionId`s: no FSRS progress, review log or Settings tick.
     - Flag Matching relies on `flagSimilarity.json` listing every pair, not just the closest.
     - Capital Matching relies on `countryNeighbours.json` keeping at least `CAPITAL_NEIGHBOURS_LATER`.
   - Card CSS that colours a reveal must not rely on load order against `Flashcard.css` or `TypedAnswerReveal.css`: Matching and Ordering load `Flashcard.css` first, so same-specificity rules can flip.
   - FSRS (`fsrs.ts`) only measures familiarity: no due dates, endless sessions. Only a question's first answer of a day is an FSRS review (`reviewQuestion`).
   - Each answer is saved as it is given (`Flashcard`'s `onAnswer`), so a country joins the Passport at its first answer. The card's random picks are made by the screen, not `Flashcard`, so a resumed card (`src/shared/unfinishedCard.ts`) keeps them.
   - The review log (`src/shared/reviewLog.ts`) is for tuning FSRS later and is for real answers only; nothing reads it yet.
2. **Globe** (`src/features/globe/`) – satellite globe, search and info panel.
   - Search takes the shapes as an argument (`searchPlacesFromShapes`) so the Passport editor, which shares `countryNameSearch.ts`, doesn't load the map data.
   - The map's handlers are set up once, so they read the Regions mode from `isShowingRegionsRef`.
   - Phones raise the globe (`PHONE_GLOBE_RAISE`); `flyToCountry` and `flyToGroup` don't correct for it, by choice.
3. **Settings** (`src/features/settings/`, `src/shared/settings.ts`) – which question types are learned. A saved choice is kept as is, so a question type added later starts unticked for existing users.
   - `Credits.tsx` and `CREDITS.md` change together. Library licences come from a file the build writes (`build.license` in `vite.config.ts`), so the dev server doesn't list them, and they don't cover the APK's native libraries.
   - Edit Passport (`passportEdit.ts`): Passport membership is just having progress, so removing a country deletes its progress, discovery time and review log entries.
4. **Passport** (`src/features/passport/`) – countries with any question answered. Familiarity (`familiarity.ts`) is one measure shared by card picking, the ring and the Passport.
5. **Extras** (`src/features/extras/`) – games and the all-countries table (`CountryTable.tsx`), which never read or write progress.
6. **Tutorial** (`src/features/tutorial/`, wording in `tutorialNotes.ts`) – shown by `App.tsx` instead of any screen; its steps have no history entries, only one guard entry.
7. **Dev menu** (`src/features/dev/`) – dev server only (`import.meta.env.DEV`).

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor** (`capacitor.config.ts`, native project in `android/`).
  - App ID `world.citizen` must never change, or installed apps can't be updated.
  - Release APKs are signed by `android/app/build.gradle` from the gitignored `android/keystore.properties`, which points at a keystore in `~/Keystores/`. Never commit either; losing the keystore or its passwords means installed apps can't be updated. Without the properties file, release builds come out unsigned. Raise `versionCode` for each APK sent out.
  - `npm run android:sync` builds the web app and copies it into `android/`. Then build from Android Studio (`npx cap open android`), or `cd android && ./gradlew assembleDebug` with `JAVA_HOME` set to a Java 21 JDK, e.g. `~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home` (Android Studio's bundled JDK 25 isn't supported by Gradle 8.14).
- **Build tool:** Vite. Needs npm 11+ (npm 10 crashes on Vitest 5's peer dependencies; use `npx npm@11 install`).
- **UI:** React + TypeScript, plain CSS one file per component, shared colours as CSS variables in `src/index.css`. Font Roboto Mono; missing symbols come from fallback fonts written by `node scripts/make-symbol-fonts.mjs`, so a new symbol must be added to both the script and the `unicode-range` in `src/index.css`.
- **Formatting and linting:** Prettier (`npm run format`), oxlint (`npm run lint`); a husky pre-commit hook formats staged files.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL map isn't unit-tested. Vitest's module cache doesn't notice files added to an `import.meta.glob` folder (e.g. a new `countryInfo/` file); run `npx vitest --clearCache`. CI (`.github/workflows/ci.yml`) runs lint, format check, build and tests.
- **Globe:** MapLibre GL JS (`countryMap.ts` creates every globe). Borders are a GeoJSON source; highlights use feature state (no data rebuilds).
  - MapLibre's worker script is imported with `?url` and passed to `setWorkerUrl`, as MapLibre can't find it after bundling.
  - Rejected: `globe.gl` (too slow on phones, blurry zoomed in), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all data bundled, no runtime network dependency.
- **Storage:** localStorage only (`src/shared/`); could move to Capacitor Preferences if WebView storage proves unreliable.

## Performance guidelines (Android WebView)
- Let MapLibre handle level of detail: pass full-detail borders and tiled imagery, not single large images or pre-simplified geometry.
- Cap the device pixel ratio (`MAX_PIXEL_RATIO` in `countryMap.ts`).
- Only set up hover handling on devices that can hover.
- Lazy-load every globe so the rest of the app stays fast.

## Data
Generated files are committed; each script lists its download links.

- Borders: Natural Earth 1:50m from `world-atlas`, ISO numeric IDs converted to alpha-3 with `i18n-iso-countries`. Some areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code; Kosovo is a country, given `XKX` by name (`CODES_OF_UNCODED_COUNTRIES`), a code that must never change.
  - 50m leaves out Tuvalu, so `node scripts/make-tuvalu-outline.mjs` writes it from 1:10m.
  - Shapes crossing 180° or surrounding the South Pole are converted for MapLibre in `flatMapGeometry.ts`.
- Background imagery: NASA Blue Marble Next Generation (public domain), from `scripts/make-background-tiles.sh <source-folder>` (needs GDAL).
- Population lights: GHS-POP R2023A (CC BY 4.0), from `python3 -I scripts/make-population-lights.py <source-folder>` (needs GDAL, numpy, Pillow). Chosen over NASA night lights because it maps people, not electric light. For looks only. Empty tiles aren't written, so those requests fail by design.
- Named ranges (`src/shared/statRanges.ts`): range questions tell options apart by `name`, so names must stay unique within a list (a test checks).
- Main landmass (`mainLandmass.ts`) is the one copy of the rule. Exceptions in `src/data/mainLandmassOverrides.json`; after editing one, rerun the country pictures and nearest countries scripts.
- Country pictures: `node scripts/make-country-images.mjs [codes...]`.
- Flags: `node scripts/make-flags.mjs [codes...]` (hampusborgos/country-flags, public domain, pinned by `SOURCE_COMMIT`), chosen because flags keep their real proportions.
  - Flag similarity: `node scripts/make-flag-similarity.mjs` (comparison in `flagSimilarity.ts`); rerun after changing the flags or the comparison. Matching designs regardless of colour was tried and dropped, as every vertical tricolour tied.
- Nearest countries: `node scripts/make-country-neighbours.mjs`, measured between main landmasses.
- Far-off parts (`src/data/farOffParts.json`) are shown as territories on the globe but count as their country everywhere else. Only areas several thousand km from their mainland are listed, on purpose. After editing the list, rerun the pictures, nearest countries and borders scripts.
- Land borders: `node scripts/make-country-borders.mjs`; areas outside the 197 are left out, so e.g. Morocco–Mauritania (via Western Sahara) aren't neighbours.
- App icon: `node scripts/make-app-icon.mjs`. The main menu's `SpinningLogo.tsx` has its own copy of the design's constants, so change both together. Its land is from `node scripts/make-logo-land.mjs`.
- `src/data/countries.json` from `node scripts/make-country-data.mjs <source-folder>`.
  - Names, capitals, area: mledoze/countries (Serbia's area has Kosovo's taken off, `AREA_TAKEN_OFF`). Population: UN WPP 2024 (2025, medium). HDI and IHDI: UNDP HDR 2025.
  - `ihdiBreakdown` is worked out in the script from UNDP's indicators; it throws if the result stops matching UNDP's IHDI.
  - `ihdiEstimate` is a fit from HDI, kept apart from `ihdi` so real and estimated values never mix.
  - Groups come from the hand-written `src/data/countryGroups.json`. A group's `id` must never change (it is saved); rename by `name`.
- Group colours: `node scripts/make-country-group-colours.mjs` (rerun after editing groups; `--all` repicks). `node scripts/make-country-groups-map.mjs` redraws `docs/country-groups.png`.
- Hand-written: `src/data/continents.json` (transcontinental countries placed by choice), `src/data/countryNameAlternatives.json`, `src/data/capitalNativeNames.json` (by Claude; owner to check), `src/data/territorySubtitles.json` (contested areas get neutral wording).
- A native name must not match another country's names, as the naming game and Borders take the first match.
- `src/data/countryInfo/{ISO}.md`: AI-written paragraphs under exactly the headings in `COUNTRY_INFO_HEADINGS`, loaded per country on demand (`loadCountryInfo`) to stay out of the main bundle.

## Status
- Not yet checked on a real phone: the location and name globe questions, the tutorial and Name every country (especially their bottom panels above the on-screen keyboard), dragging in Matching and Ordering, the Credits screen's links, and Population's smoothness.
- Next: range boundaries page.
- Todo: add notices for the APK's native Android libraries (Capacitor Android, AndroidX) to the Credits screen.
- Possible later: more facts (region, languages, etc.); ship the website as a PWA.
- Owner to review `territorySubtitles.json`.
- Owner to fact-check `countryInfo/` (all but Canada, US, UK and India drafted by Claude), especially recent events and small countries.
- Todo: check the estimated IHDIs (`ihdiEstimate`) that may be wrong, then either hand-enter real values from other sources or skip their IHDI question. Likely too low: Turkmenistan, Uzbekistan. Likely too high: Caribbean countries (Dominica, Grenada, St Vincent, St Kitts, Antigua, Cuba, Guyana, Suriname, Trinidad, Belize) and Equatorial Guinea. Within 0.01 of a title boundary: Guyana, Micronesia, Liechtenstein, Kuwait, Antigua. Least doubtful: Qatar, Bahrain, Saudi Arabia, Eritrea, San Marino.
- Todo: review `UNFAMILIAR_RECALL` in `passport.ts`: a country just discovered with every answer right counts as unfamiliar until answered right again.
