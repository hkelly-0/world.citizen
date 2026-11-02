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

Main menu: Flashcards, Globe, Passport, Extras, Settings. Screens are switched with React state in `src/App.tsx` (no URL routing); each screen, and the globe's open info panel, pushes a same-URL history entry so back (browser, or Android via `@capacitor/app` in `src/main.tsx`) steps through them. Features link up via ISO alpha-3 codes. Scope: the 195 countries (193 UN members + Vatican and Palestine).

1. **Flashcards** (`src/features/flashcards/`) – one card per country, asking globe, flag, area, population, IHDI and capital in that order, then the info questions.
   - **Info questions** (`INFO_QUESTION_IDS` in `deck.ts`, `InfoQuestion` in `Flashcard.tsx`) are full `QuestionId`s, one per `countryInfo/` section: the topic and Reveal, then the paragraph and self-ratings scored as wrong / close / right. The rating goes on, so there is no Next or click-anywhere.
   - The globe question is a coin flip between `LocateCountryGlobe.tsx` and `NameCountryGlobe.tsx`; they share one FSRS progress. The location question gives a second try after a wrong tap, which counts as close if right.
   - Wrong flag options come from similar-looking flags or, with chance `NEIGHBOUR_FLAGS_CHANCE`, nearest countries (`SIMILAR_FLAGS_FROM` and `flagOptions` in `flagQuestion.ts`). Area, population and IHDI are answered by picking a named range. Typed answers ignore case, accents and surrounding spaces, with no fuzzy matching; names also accept the official name, `countryNameAlternatives.json` and the native names (`nativeNames`), and capitals their native names (`capitalNativeNames.json`).
   - **Classic** asks every question learned in Settings and discovers new countries. **Custom Practice** (`CustomPracticeMenu.tsx`) asks only the ticked question types, about Passport countries only (`FlashcardsView`'s `mode`); unpractised questions keep their progress and don't affect which country comes next. Its menu reopens with the boxes ticked at the last Go (`src/shared/customPracticeChoices.ts`), minus any no longer offered.
   - **Multi-country questions** (`multiCountryQuestions.ts`) ask about several Passport countries at once, so aren't `QuestionId`s: no FSRS progress, review log or Settings tick. Each is offered only when its `LEARNED_QUESTION_NEEDED` is learned (`offeredMultiCountryQuestionIds`). `FlashcardsView` asks one after every `CARDS_PER_MULTI_COUNTRY_QUESTION` cards (after the reward): in Classic any offered kind the Passport can make (skipped for another round if none), its count saved for the day in `src/shared/classicCardCount.ts` and kept until the question is answered, so one left unanswered is asked on reopening; in Custom Practice the ticked ones. Ticked alone in Custom Practice, `App.tsx` shows `MultiCountryPracticeView` instead. Both show them with `MultiCountryCard.tsx`. The Custom Practice menu disables those the Passport can't make (one note for the section, `canMakeMultiCountryQuestion`).
     - **Borders** (`bordersQuestion.ts`, `BordersCard.tsx`) is one of them though it is about one country (`bordersQuestionCountry`), and is always offered.
     - **Matching** (`MatchingCard.tsx`, its `kind` choosing which): labels dragged or tapped onto targets. Each starts from a random Passport country.
       - Flag Matching (`flagMatchingQuestion.ts`): names onto flags, with the Passport countries with the most similar flags. Relies on `flagSimilarity.json` listing every pair, not just the closest.
       - Capital Matching (`capitalMatchingQuestion.ts`): capitals onto country names, with Passport countries from the nearest neighbours first (`CAPITAL_NEIGHBOURS_FIRST`, then `CAPITAL_NEIGHBOURS_LATER`), then any. Relies on `countryNeighbours.json` keeping at least `CAPITAL_NEIGHBOURS_LATER`.
     - **Ordering** by population, area or IHDI (`orderingQuestion.ts`, `OrderingCard.tsx`): Passport countries with different range titles (so no ties; estimated IHDIs count, no-data ones don't), dragged or tapped into order.
   - Card CSS that colours a reveal must not rely on load order against `Flashcard.css` or `TypedAnswerReveal.css`: Matching and Ordering load `Flashcard.css` before the regular card does, so same-specificity rules in those files can flip.
   - New countries come one country group at a time, chosen on `RegionGlobe.tsx` (shared by Classic and the Passport) and saved in `src/shared/learningGroup.ts`. `pendingGroupId` in `passport.ts` works out from progress whether it is finished, so a group finished anywhere is done.
   - Card choice: no due dates, endless sessions. FSRS (`fsrs.ts`, `ts-fsrs`, whole days, default parameters) only measures familiarity. Only a question's first answer of a day is an FSRS review (`reviewQuestion`); later ones only update `latestRepeatAnswer`. A range pick one title off counts as Hard (`rangeAnswerResult`). Countries are picked weighted by unfamiliarity (`chooseRandomCountry` in `deck.ts`), and Classic brings a new country whenever `isTooUnfamiliarForNewCountry` is false.
   - Each answer is saved (FSRS review and review log) as it is given, through `Flashcard`'s `onAnswer`, so a new country joins the Passport, and is discovered, at its first answer. Classic keeps its current card in `src/shared/unfinishedCard.ts` and resumes it at the next unanswered question when reopened the same day. On a later day it picks a new card. Custom Practice and the Passport card don't resume. The card's random picks (globe kind, flag options) are made by the screen, not `Flashcard`, so a resumed card keeps them.
   - Each finished card is followed by `CardReward.tsx` (`rewardAfterCard`). Its familiarity ring always covers the questions learned in Settings, so it matches the Passport even in Custom Practice.
   - Every answer is logged (`src/shared/reviewLog.ts`) for tuning FSRS later; nothing reads it yet.
2. **Globe** (`src/features/globe/`) – satellite globe with a search box that also finds territories (`searchPlacesFromShapes` takes the shapes as an argument so the Passport editor, which shares `countryNameSearch.ts`, doesn't load the map data); tapping a country opens an info panel.
   - Selecting a country centres its main landmass and zooms by its width (`focusZoom.ts`, with `FOCUS_ZOOM_OVERRIDES`), corrected for latitude (`latitudeZoom.ts`) because MapLibre enlarges the globe near the poles. The flashcard globes reuse this. Zoom limits for all globes are in `zoomLimits.ts`.
   - A gear under the back button opens the globe settings (`GlobeSettings.tsx`, not saved). **Show Regions** shows the group tint (the map is always created with it, hidden by `setGroupTintShown`) and makes taps, hover and search select a whole group, shown in `RegionInfoPanel.tsx`. The map's handlers read the mode from `isShowingRegionsRef`, as they are set up once.
   - Every shape gets a tap/hover buffer of fixed screen pixels (`tapBuffer.ts`, via `findTappedCountryIndex` in `countryMap.ts`): very small countries win it even over land, other shapes only over the ocean (nearest edge).
3. **Settings** (`src/features/settings/`, `src/shared/settings.ts`) – the root control for which question types are learned, saved on every change (`SettingsMenu` has no local state). Unticked ones are hidden from the Passport card, Classic and Custom Practice (the globe's info panel shows everything), but their progress is kept. A saved choice is kept as it is, so a question type added later starts unticked for existing users. `CountryIcon` picks outline or flag as the main country picture (a question mark stands in until a flag question is answered).
   - **Edit Passport** (`PassportEditor.tsx`, logic in `passportEdit.ts`): a searchable checklist of all 195, behind an "Are you sure?". Since Passport membership is just having progress, removing a country deletes its FSRS progress, discovery time and review log entries (confirmed again on Save); adding one gives each learned question one made-up right answer today and a discovery time, but nothing in the review log (it is for real answers only). Saving also clears the chosen learning group, so a group is chosen again before the next new country.
4. **Passport** (`src/features/passport/`) – grid of countries with any question answered, sortable (`src/shared/passportSort.ts`; discovery times in `src/shared/discoveries.ts`). Tapping one offers its card (`PassportFlashcardView.tsx`); a trailing "New country" card discovers one from the pending group (`randomUnseenCountryInGroup`).
   - Familiarity (`countryRecall` and `questionFamiliarity` in `familiarity.ts`): the average FSRS recall of the answered, learned questions `FAMILIARITY_DAYS_AHEAD` days ahead, plus `PRACTISED_TODAY_BONUS` for a question answered right again today. The same measure drives card picking (`pickingFamiliarity`), the ring (`RecallCircle.tsx`) and `isTooUnfamiliarForNewCountry`.
5. **Extras** (`src/features/extras/`) – games outside the flashcards that never read or write progress. **Name every country** (`NameEveryCountry.tsx`, logic in `namingGame.ts`): played for the world or one continent (`NAMING_AREAS`, one menu button each, the chosen id kept in the screen's history entry). Every country of the area starts highlighted on a globe turned towards it and is unhighlighted when its name is typed, with the name question's answer rules (`isCountryNameCorrect`); a country outside the area counts as wrong. Nothing is saved, so leaving starts it again.
6. **Tutorial** (`src/features/tutorial/`, wording in `tutorialNotes.ts`) – shown by `App.tsx` instead of any screen, with no history entries of its own. Opens by itself until finished or skipped (`src/shared/tutorial.ts`), never for someone whose Passport has countries, and from Settings' "Replay tutorial". The user chooses a home country and plays its card (`HomeCountryCard.tsx`, every question type whatever is learned in Settings) as real progress (it doesn't choose the learning group), with notes passed through the `notes` / `note` props of `Flashcard`, `LocateCountryGlobe` and `CardReward`. Then the real Passport and Flashcards menu are shown `inert` under a pinned note, and Settings in its `tutorialNote` mode, which saves `SUGGESTED_QUESTION_IDS` as it opens.
7. **Dev menu** (`src/features/dev/`) – dev server only (`import.meta.env.DEV`): a tab on every screen (`DevTools.tsx`) with buttons that edit saved progress (`devProgress.ts`) and remount the current screen, and a toggle that tints globes by country group (`showCountryGroups.ts`, not saved, read when a globe is created).

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor** (`capacitor.config.ts`, native project in `android/`).
  - App ID `world.citizen` must never change, or installed apps can't be updated.
  - `npm run android:sync` builds the web app and copies it into `android/` (the copy is gitignored). Then build from Android Studio (`npx cap open android`), or `cd android && ./gradlew assembleDebug` with `JAVA_HOME` set to a Java 21 JDK, e.g. `~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home` (Android Studio's bundled JDK 25 isn't supported by Gradle 8.14).
- **Build tool:** Vite. Needs npm 11+: npm 10 crashes resolving Vitest 5's peer dependencies, so on npm 10 use `npx npm@11 install`.
- **UI:** React + TypeScript. Plain CSS, one file per component; shared colours are CSS variables on `:root` in `src/index.css`. Font is Roboto Mono (`@fontsource/roboto-mono`). Symbols it lacks come from tiny fallback fonts written by `node scripts/make-symbol-fonts.mjs` (≥ from the original Roboto Mono, others from JetBrains Mono); a new symbol must be added to both the script and the `unicode-range` in `src/index.css`.
- **Formatting and linting:** Prettier (`npm run format`) and oxlint (`npm run lint`); a husky pre-commit hook formats staged files.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL map isn't unit-tested. CI (`.github/workflows/ci.yml`) runs lint, format check, build and tests.
- **Globe:** MapLibre GL JS (`countryMap.ts` creates every globe): globe projection zoomed out, blending into flat Mercator. Borders are a GeoJSON source that MapLibre tiles and simplifies; taps use `queryRenderedFeatures`, highlights use feature state (no data rebuilds).
  - MapLibre's worker script is imported with `?url` and passed to `setWorkerUrl`, as MapLibre can't find it after bundling.
  - Rejected: `globe.gl` (tried first; too slow on phones, one 3D mesh per country, and blurry when zoomed in), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all data bundled, no runtime network dependency.
- **Storage:** localStorage only (`src/shared/`); could move to Capacitor Preferences if WebView storage proves unreliable. Old SM-2 progress is deleted on load (`removeOldSm2Progress` in `progress.ts`).

## Performance guidelines (Android WebView)
- Let MapLibre handle level of detail: pass full-detail borders and tiled imagery, not single large images or pre-simplified geometry.
- Cap the device pixel ratio (`MAX_PIXEL_RATIO` in `countryMap.ts`).
- Only set up hover handling on devices that can hover.
- Lazy-load every globe (globe screen, region globe, flashcard location and name globes) so the rest of the app stays fast.

## Data
Generated files are committed; each script lists its download links.

- Borders: Natural Earth 1:50m TopoJSON from `world-atlas`, ISO numeric IDs converted to alpha-3 with `i18n-iso-countries`. A few areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code.
  - 50m leaves out Tuvalu, so `node scripts/make-tuvalu-outline.mjs` writes `src/data/tuvaluOutline.json` from 1:10m, appended in `src/shared/countries.ts`.
  - Russia, Fiji and Antarctica cross the 180° meridian or surround the South Pole; `flatMapGeometry.ts` converts them for MapLibre's flat tiles.
- Background imagery: NASA Blue Marble Next Generation (June 2004, public domain) as WebP tiles in `public/tiles/satellite/`. Regenerate with `scripts/make-background-tiles.sh <source-folder>` (needs GDAL). Imagery stops gaining detail a few zoom levels before borders do.
- Named ranges (`src/shared/statRanges.ts`): population, area and IHDI are only ever shown and asked as range titles, never exact numbers. Each range has a `bound` and a `name`, shown by `RangeTitle.tsx`; range questions tell options apart by `name`, so names must stay unique within a list (a test checks).
- Main landmass (`mainLandmass.ts`) is the one copy of the rule, used by the globes, pictures and neighbours. Exceptions are boxes in `src/data/mainLandmassOverrides.json` (east may exceed 180 across the antimeridian). After editing an override, rerun the country pictures and nearest countries scripts.
- Country pictures: `public/country-images/{ISO}.webp` from `node scripts/make-country-images.mjs [codes...]`.
- Flags: `public/flags/{ISO}.svg` from `node scripts/make-flags.mjs [codes...]` (hampusborgos/country-flags, public domain, pinned by `SOURCE_COMMIT`), chosen because flags keep their real proportions (unlike `flag-icons`).
  - Flag similarity: `node scripts/make-flag-similarity.mjs` writes `src/data/flagSimilarity.json` and redraws `docs/flag-similarity.png` for checking by eye; comparison in `flagSimilarity.ts`. Matching designs regardless of colour was tried and dropped, as every vertical tricolour tied. Rerun after changing the flags or the comparison.
- Nearest countries: `node scripts/make-country-neighbours.mjs` writes `src/data/countryNeighbours.json`, measured between main landmasses (bordering = 0 km, ties by centre distance).
- Far-off parts: `loadCountryShapes` splits the parts listed in `src/data/farOffParts.json` (e.g. French Guiana) into shapes of their own with `partOf` set, so the globe shows them as territories, with their status in `territorySubtitles.json` keyed by name. Everything else still counts them as their country: the flashcard globes (`shapeIndicesOfCountry`, `countryCodeOfShape`), and the framing, pictures, nearest countries and borders (`wholeCountryGeometry`). Only areas several thousand km from their mainland are listed; nearer island regions (e.g. Canary Islands, Galápagos, Svalbard), exclaves (Alaska, Kaliningrad) and archipelago countries' own islands stay part of their country on purpose. After editing the list, rerun those three scripts.
- Land borders: `node scripts/make-country-borders.mjs` writes `src/data/countryBorders.json`: countries sharing an edge (one corner doesn't count), overseas parts included (France–Brazil via French Guiana). Areas outside the 195 are left out, so e.g. Serbia–Albania (via Kosovo) aren't neighbours, nor France–Netherlands (via Sint Maarten).
- App icon: `node scripts/make-app-icon.mjs` writes the Android mipmaps, `public/favicon.svg` and `public/apple-touch-icon.png`. The main menu's logo is a spinning copy drawn live (`SpinningLogo.tsx`) with its own copy of the design's constants, so change both together. Its land is `src/data/logoLand.json`, simplified for speed by `node scripts/make-logo-land.mjs` (`MIN_TRIANGLE_AREA` chosen by eye).
- `src/data/countries.json` (`CountryFacts` in `countryFacts.ts`) from `node scripts/make-country-data.mjs <source-folder>`.
  - Names, capitals, area: mledoze/countries (a few missing second capitals added in the script). Population: UN WPP 2024, 2025 medium variant. HDI and IHDI: UNDP HDR 2025, latest year per country.
  - `ihdiEstimate`: a least-squares fit from HDI for countries without an IHDI, kept apart from `ihdi` so real and estimated values never mix; marked as estimated in the UI.
  - `groupId` / `groupName` come from the hand-written `src/data/countryGroups.json`, a partition of the 195 into small groups of neighbours (the script validates it). A group's `id` must never change (it is saved as the user's chosen group); rename by `name`.
- Group colours: `src/data/countryGroupColours.json` from `node scripts/make-country-group-colours.mjs` (rule in `countryGroupColours.ts`). Rerun after editing groups: existing colours are kept (`--all` repicks), and they can be hand-edited as `hsl(...)`. A test fails if a group lacks a colour or bordering groups' hues are too close. `node scripts/make-country-groups-map.mjs` redraws `docs/country-groups.png`.
- `src/data/continents.json` – hand-written, each of the 195 in exactly one continent (a test checks it); transcontinental countries were placed by choice (Russia and Cyprus in Europe; Turkey, the Caucasus and Kazakhstan in Asia; Egypt in Africa).
- `src/data/countryNameAlternatives.json` – hand-written other names (read with `alternativeNames`), used by the name question and the search.
- Native names, in their own scripts, count as typed answers but aren't searched. Country names come from mledoze's `name.native` (`nativeNames` in `countries.json`). Capitals are hand-written by Claude in `src/data/capitalNativeNames.json` (read with `nativeCapitalNames`), listed only where they differ from the English name by more than accents. Owner to check them. A native name must not match another country's names, as the naming game and Borders take the first match.
- `src/data/countryInfo/{ISO}.md` – AI-written plain-text paragraphs under exactly the headings in `COUNTRY_INFO_HEADINGS`, kept short (limits beside `COUNTRY_INFO_HEADINGS`), read with `loadCountryInfo` (`src/shared/countryInfo.ts`), which loads one country's file on demand so the text stays out of the main bundle. Shown in the globe's info panel (`CountryInfoSections.tsx`, via `showCountryInfo`, so not on the Passport card), all of them whatever is learned in Settings, and asked as info questions only for topics learned there. `CountryInfo`'s keys are the info questions' saved ids, so never rename them.
- `src/data/territorySubtitles.json` – hand-written description of each map area outside the 195, keyed by ISO code or map name (after `FULL_MAP_NAMES` in `countries.ts` writes out Natural Earth's abbreviations); `{ISO}` links to that country. Contested areas get neutral wording.

## Status
- Not yet checked on a real phone: the location and name globe questions, the tutorial (its notes over the globe and screens) and Name every country (especially their bottom panels above the on-screen keyboard), and dragging in Matching and Ordering.
- Next: range boundaries page. Later for Android: release signing keystore (keep it backed up, never commit it).
- Possible later: more facts (region, languages, etc.); ship the website as a PWA.
- Owner to review `territorySubtitles.json`.
- Owner to fact-check `countryInfo/` (all but Canada, US, UK and India drafted by Claude), especially recent events and small countries.
- Todo: check the estimated IHDIs (`ihdiEstimate`) that may be wrong, then either hand-enter real values from other sources or skip their IHDI question. Likely too low: Turkmenistan, Uzbekistan (post-Soviet states come in above the line). Likely too high: Caribbean countries (Dominica, Grenada, St Vincent, St Kitts, Antigua, Cuba, Guyana, Suriname, Trinidad, Belize) and Equatorial Guinea. Within 0.01 of a title boundary: Guyana, Micronesia, Liechtenstein, Kuwait, Antigua. Least doubtful: Qatar, Bahrain, Saudi Arabia, Eritrea, San Marino.
- Todo: review `UNFAMILIAR_RECALL` in `passport.ts`. A country just discovered with every answer right is just below it, so it counts as unfamiliar until its card is answered right again that day (the practised-today bonus) or on a later day.
