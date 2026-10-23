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
The app opens on a main menu (Flashcards, Globe, Passport, and a smaller Settings button pinned to the bottom); each screen has a "← Menu" back button that returns to the main menu. Screens are switched with React state in `src/App.tsx` (no URL routing). Each screen, and the globe's open info panel, adds a browser history entry with the same URL, so back (browser, or Android via `@capacitor/app` in `src/main.tsx`) closes the panel, then returns to the main menu (opening Classic or Custom Practice replaces the flashcards menu's history entry, and Go replaces Custom Practice's, so back skips them); on Android, back from the main menu closes the app.

1. **Flashcards** – learn facts about countries, with locally saved progress.
   - Flashcards opens a flashcards menu (`FlashcardsMenu.tsx`): **Classic** (the full country cards described below) or **Custom Practice** (`CustomPracticeMenu.tsx`): "Select which question types to see today", a checkbox for each of "Locate country on globe", "Name country from globe", Area, Population, IHDI and Capital (all unticked to start), and a "Go" button, disabled until one is ticked. Go starts cards asking only the ticked questions, in the usual order. The two globe options are the same question type with one shared FSRS schedule: if only one is ticked, the globe question is always asked that way; if both are ticked, it is a coin flip as in Classic. If only the globe question is asked, each card ends after it, and the globe doesn't fade to reveal the card, so the next country's globe follows without the card flashing up. Only the ticked questions decide which countries are due (earliest ticked question due first; countries with none of them answered are new) and only they are reviewed; the others keep their schedules. The ticked types (and which globe kinds) are kept in the history entry, so reloading the website keeps them.
   - Scope: 193 UN members + 2 observers (Vatican, Palestine).
   - One card per country, showing its picture and common name. Questions in order: a globe question (location or name, see below), area, population, IHDI (tap one range-title button; IHDI also offers "No data", and after answering says "Estimated" when the answer is our estimate, see Data), then capital (typed; the "Reveal" button works even with nothing typed, which counts as wrong). Each answer is revealed (correct option green, wrong pick red, or orange if it is one title away from the correct one) before a "Next" button.
   - Location question: a full-screen globe (`LocateCountryGlobe.tsx`) with "Select Finland" over it. The user spins and zooms, then taps a country. Tapping the ocean does nothing; tapping any land is the answer (areas outside the 195, e.g. Greenland, are wrong). The tapped country turns green or red; if wrong, its name fades in in red in the middle of the screen, then fades out as the correct country turns green. Either way the globe then flies to the correct country (same centre and zoom as tapping a country on the globe screen), and a "Next" button appears along the bottom. The globe stays until it is pressed, then fades to reveal the card, with no result text.
   - Name question (`NameCountryGlobe.tsx`), asked instead of the location question half the time (a coin flip each time the card is shown): a full-screen globe opened (no flying) on the country, highlighted yellow, at the same centre and zoom as tapping it on the globe screen. The user can spin and zoom; taps do nothing. A panel along the bottom says "This is" above a text box and "Reveal" button. The answer is revealed like the capital's (see below), and once the correct name has finished typing out a "Next" button appears in the panel; the globe stays until it is pressed, then fades to reveal the card. Accepted: the common name, the official name, or a hand-written alternative (`src/data/countryNameAlternatives.json`, e.g. "Turkey", "USA", "Burma"), with the same matching rules as the capital.
   - After any answer there is no "Correct"/"Wrong" text: range options are coloured, and for the capital the text box turns green with green text if right, or the typed text fades red and the correct capital is typed out in green beside it. Capital check ignores case, accents and surrounding spaces; spelling must otherwise be exact (no fuzzy matching). Any one of several capitals counts.
   - Scheduling: FSRS (Anki's default algorithm, via the `ts-fsrs` package, in `fsrs.ts`), with a separate schedule for each of a country's 5 questions (globe, area, population, IHDI, capital; the location and name questions share the globe schedule). Each question has a stability (days until the chance of remembering drops to 90%) and a difficulty (1–10), and is due when its predicted recall chance drops to 90%. Settings: whole days only (no same-day learning steps), fuzz on (intervals spread a little at random), default parameters. Right is rated Good, wrong Again (always due tomorrow, even when FSRS alone would wait longer). A range question (area, population, IHDI) picked one title away from the correct one is rated Hard (`rangeAnswerResult` in `rangeQuestions.ts`): a weak pass, due sooner than Good and marked more difficult. IHDI's "No data" is never one title away. Early reviews count for less, as FSRS uses the days actually passed. Every answer is also logged (`src/shared/reviewLog.ts`) so FSRS can later be tuned to real use; nothing reads the log yet. Progress saved before the switch from SM-2 is deleted, along with the Passport's discovery times, on first load (`removeOldSm2Progress` in `progress.ts`, called from `main.tsx`). A country's card is due when its earliest question is due (`countryDueDate` in `deck.ts`, which also takes the question types being practised), and finishing a card reviews all its questions, including ones not yet due. Due countries come first (most overdue first), then unseen countries in random order, with no daily limit on new cards. Per-question schedules let Custom Practice (above) practise some question types without affecting the others.
   - Possible later additions: more facts (flag, region, languages, etc.).
2. **Interactive globe** – spin and pinch-zoom a 3D globe with satellite imagery, which flattens into a map when zoomed in; tap a country to open an info panel; the globe turns to centre the country's main landmass in the space above the panel (`mainLandmass.ts`; see Data → Country pictures) and zooms by its width (`focusZoom.ts`): countries up to ~320 km across (São Tomé and Príncipe) go to zoom 4.1, and wider ones zoom out 0.35 per extra 1000 km (Ivory Coast ~3.9, India ~2.6), stopping at 1.25. When the globe is 768 px or wider (laptops) it zooms in further: tiny countries 4.3, then 0.255 per extra 1000 km. These zooms are for the equator: elsewhere the zoom is lowered by log2(1/cos(latitude)) (`latitudeZoom.ts`), the amount MapLibre enlarges the globe by there, so a country is drawn the same size as one of the same width at the equator (e.g. China, 37°N, goes to 1.9 on phones and 2.6 on laptops). Russia and Canada have hand-picked zooms in `focusZoom.ts` (phone/laptop: Russia 1.0/1.45, Canada 1.4/2.2), because the formula left them too far out.
   - Search box (top right, `CountrySearch.tsx`, matching in `countryNameSearch.ts`): finds the 195 countries by common name. From 3 letters typed it suggests up to 6 countries whose common name, or an alternative name from `countryNameAlternatives.json` (e.g. "burma" → Myanmar), has a word starting with the text, ignoring case and accents ("kor" → North Korea, South Korea), names starting with it first. Tapping a suggestion, or Enter for the top (or arrow-key highlighted) one, selects the country as if tapped on the globe, then clears the box and closes the keyboard.

Both globes limit zoom (`zoomLimits.ts`): at the equator the minimum is 1.3 on phones and 1.8 when the globe is 768 px or wider, and the maximum is 6. MapLibre draws the globe larger near the poles (by 1/cos(latitude)) and already lowers the minimum zoom to match, so the minimum is passed unchanged and the zoomed-out globe is the same size everywhere. The maximum is lowered here by the same amount (`latitudeZoom.ts`, capped at 85.05° like MapLibre).

Tap buffer (`tapBuffer.ts`, used by both globes through `findTappedCountryIndex` in `countryMap.ts`): the 25 countries under 1,000 km² (Vatican, Monaco, Tuvalu, Singapore, etc.) are only a few pixels wide on the globe, so a tap within 20 screen pixels of one counts as a tap on it, even if it lands on a bigger neighbour. Hover (pointer cursor and highlight) uses it too, so what is highlighted is what a click picks.

3. **Settings** (`src/features/settings/SettingsMenu.tsx`, saved by `src/shared/settings.ts` in localStorage) – the root control for what is learned. Same layout as Custom Practice: "Information I want to learn:" with a checkbox for each of Location, Area, Population, IHDI and Capital (all ticked by default), and a button that reads "Saved" (disabled) until a box is changed, then "Save" (disabled if none is ticked); saving stays on the screen and the button goes back to "Saved". "← Menu" returns to the main menu, discarding unsaved changes. Unticked information isn't shown on the globe's info panel (names are always shown; Location has nothing there), isn't asked in Classic, and isn't offered in Custom Practice (Location off hides both globe options). Their FSRS schedules are kept.

4. **Passport** (`src/features/passport/`) – a collection of the countries the user has seen as flashcards, growing as they study. A country joins once any of its questions has been answered (Classic or Custom Practice). The main menu's button and the screen's heading read "Passport 42/195". The screen is a grid of the country pictures with their common names; tapping a country enlarges it over a dark background with its picture and the globe's info panel (`CountryInfoPanel`) showing only its common and official names, no facts, and a "Play flashcard →" button; × or tapping the background closes it. "Play flashcard →" opens that country's full card (`PassportFlashcardView.tsx`) asking the questions chosen in Settings, with the globe question always "Locate country on globe", never "Name country from globe". It is reviewed and saved as in Classic. The button after the last question (the globe's, if Location is the only one) reads "Done" instead of "Next", and "Done" or the "← Passport" back button returns to the Passport grid with no country enlarged (the card has its own history entry, keeping the country, so back does the same). Beside each name, a small ring (`RecallCircle.tsx`) shows the country's familiarity (`countryRecall`, as used by the Familiarity sort below): filled clockwise from 12 o'clock, from 1/6 at a recall chance of 50% or less to full at 100% (a question just answered wrong is about 47%, one right three times in a row about 94%), and one colour from red through orange and yellow to green as it fills; an empty grey ring if the country has none. A "Sort by" dropdown offers Alphabetical, Date discovered (first discovered at the top) or Familiarity (least familiar at the top, saved as `recall`: `countryRecall` in `passport.ts`, the average FSRS chance of still remembering the country's answered questions among those learned in Settings 30 days from today, as on the day of a review it is always about 100%; countries with none of those answered come last), ties A–Z, and the last choice is remembered (`src/shared/passportSort.ts`). Discovery times are saved by the flashcards when a country's first card is finished (`src/shared/discoveries.ts`); countries seen before times were recorded have none and come first in Date discovered, A–Z. With none seen it says how countries join.

Features should link up via ISO country codes, e.g. "show on globe" from a flashcard, "add to flashcards" from the globe info panel.

## Architecture decisions
- **One web codebase**, deployed as the website and packaged as an APK with **Capacitor** (`capacitor.config.ts`, native project in `android/`).
  - App ID `world.citizen` (must never change, or installed apps can't be updated); app name `world.citizen`.
  - `npm run android:sync` builds the web app and copies it into `android/` (the copy is gitignored). Then build/run from Android Studio (`npx cap open android`), or `cd android && ./gradlew assembleDebug` with `JAVA_HOME` set to a Java 21 JDK, e.g. `~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home` (the project targets Java 21; Android Studio's bundled JDK is 25, which Gradle 8.14 doesn't support).
- **Build tool:** Vite.
- **UI framework:** React, written in TypeScript.
- **Styling:** plain CSS files, one per component, imported directly. The whole app uses Roboto Mono, bundled with the `@fontsource/roboto-mono` package (set in `src/index.css`, imported in `src/main.tsx`); its font lacks ← and ≥, which use the system's monospace font.
- **Tests:** Vitest + Testing Library (`npm test`). The WebGL map itself is not unit-tested.
- **Globe:** MapLibre GL JS (`src/features/globe/countryMap.ts` creates the map, shared by `GlobeView.tsx` and the flashcards' `LocateCountryGlobe.tsx`). Its projection is a globe when zoomed out and blends into a flat Mercator map between zoom 4 and 5. Borders are a GeoJSON source that MapLibre tiles and simplifies per zoom level; tapped countries are found with `queryRenderedFeatures`, and hover/selection highlights use feature state (no data rebuilds).
  - MapLibre's worker script is copied by Vite (`?url` import) and passed to `setWorkerUrl`, because MapLibre can't find it after bundling.
  - Alternatives considered: `globe.gl` (tried first; too slow on phones because every country is a separate 3D mesh, and blurry/blocky when zoomed in), CesiumJS (too heavy), raw three.js (too much work).
- **Offline-first:** all country data bundled with the app, no runtime network dependency.
- **Progress storage:** local only, in localStorage (`src/shared/progress.ts`); could move to Capacitor Preferences on Android if WebView storage proves unreliable. A backend (Supabase/Firebase) only if accounts or sync are added later.
- **Optional:** also ship the website as a PWA.

## Data
- Borders: Natural Earth 1:50m TopoJSON from the `world-atlas` npm package (`world-atlas/countries-50m.json`). Countries carry ISO numeric IDs, converted to alpha-3 with `i18n-iso-countries`. A few areas (Kosovo, Somaliland, N. Cyprus, etc.) have no ISO code.
  - The 50m data leaves out Tuvalu (nine tiny atolls), so its outline comes from the 1:10m data: `node scripts/make-tuvalu-outline.mjs` writes `src/data/tuvaluOutline.json` (committed), which `src/shared/countries.ts` appends.
  - world-atlas stores Russia, Fiji and Antarctica as single shapes across the 180° meridian or around the South Pole; `src/features/globe/flatMapGeometry.ts` converts them so MapLibre's flat tiles draw them correctly.
- Background imagery: NASA Blue Marble Next Generation, June 2004, 21600×10800 (public domain), cut into WebP map tiles for zoom levels 0–6 at `public/tiles/satellite/` (~30 MB). Regenerate with `scripts/make-background-tiles.sh <source-folder>` (needs GDAL: `brew install gdal`); the script lists the download link.
  - The imagery stops gaining detail around map zoom 5; borders keep gaining detail to about zoom 8.
- Named ranges: population, area and IHDI are shown and asked as range titles with the range's lower bound (e.g. "Immense - ≥ 5M km²", "Multitudes - ≥ 100M", "Excellent - 9"; the lowest area/population range shows "< 10K km²" / "< 100K"), never exact numbers. Ranges are defined in `src/shared/statRanges.ts` (each starts at its `min`, inclusive). IHDI titles are the IHDI × 10, rounded half up. A page showing the range boundaries is planned.
- Country pictures: `public/country-images/{ISO}.webp`, 512×512, generated by `node scripts/make-country-images.mjs [codes...]` (all countries if no codes) and committed (~3 MB). Each looks straight down on the globe at the country's main landmass (far-off islands and territories are left out): the country textured with the Blue Marble tiles, other land faintly filled, all borders outlined, ocean transparent.
  - Main landmass (`src/features/globe/mainLandmass.ts`, the one copy of the rule, also used for the globe's zoom-to-country and the flashcard fly-to): the country's largest part plus parts near it. Exceptions are hand-written in `src/data/mainLandmassOverrides.json`, keyed by ISO alpha-3, e.g. `"USA": { "box": [-125, 24, -66, 50], "note": "Contiguous states only: leave out Alaska and Hawaii" }`. Every part whose centre is inside the box `[west, south, east, north]` counts (east may go above 180 for countries across the 180° meridian). After editing it, regenerate that country's picture; a test checks each box selects at least one part.
  - Countries 1000 km or more across fill 2/3 of the picture; smaller ones fill less, down to 1/2 at 100 km. Zoom is capped at 4× the tile resolution, and countries still under 20 px across (Monaco, Nauru, San Marino, Vatican) get a yellow ring.
- `src/data/countryNameAlternatives.json` – other names people use for a country (e.g. `"TUR": ["Turkey"]`), keyed by ISO alpha-3 and hand-written; read with `alternativeNames` in `countryFacts.ts`. Accepted by the flashcard name question and matched by the globe search.
- `src/data/territorySubtitles.json` – what each of the 46 map areas outside the 195 countries is, shown under its name in the info panel (e.g. Greenland: "Autonomous territory of Denmark"). A country is written as its ISO code in braces (`"Autonomous territory of {DNK}"`), shown as its common name in blue; tapping it selects that country as if tapped on the globe. Hand-written, keyed by ISO alpha-3 code, or by the map data's name for areas with none (Kosovo, Somaliland, N. Cyprus, Indian Ocean Ter., Siachen Glacier); read with `territorySubtitle` in `countryFacts.ts`. Contested areas get neutral wording naming who claims them. Tests check every such area has one and that every code in braces is one of the 195. To be reviewed by the owner.
- `src/data/countries.json` – facts for the 195 countries keyed by ISO alpha-3 (typed as `CountryFacts` in `src/shared/countryFacts.ts`), generated by `node scripts/make-country-data.mjs <source-folder>` and committed; the script lists the download links.
  - Common/official names, capitals and total area: mledoze/countries (the REST Countries dataset). A few second capitals it lacks are added by hand in the script.
  - Population: UN World Population Prospects 2024, medium-variant projection for 2025 (its estimates stop at 2023).
  - HDI and inequality-adjusted HDI: UNDP Human Development Report 2025, latest year with a value per country (`hdi`, `ihdi`). 26 countries have no IHDI; 3 of them (Monaco, North Korea, Vatican) have no HDI either and show "no data".
  - `ihdiEstimate`: for the 23 countries with an HDI but no IHDI, our own estimate from a straight line fitted (least squares) to the 169 countries with both (about 1.237 × HDI − 0.309; typically off by 0.04, at worst 0.13). Kept apart from `ihdi` so real and estimated values never mix; shown via `ihdiRange` in `statRanges.ts`, marked "(est.)" on the info panel and "Estimated" on flashcards.

## Structure
```
src/
  App.tsx           # switches between menu, globe and flashcards screens
  data/
    countries.json
  features/
    menu/           # main menu
    settings/       # settings screen: which information is learned
    passport/       # collection of countries seen as flashcards
    globe/          # shared map setup (countryMap.ts), globe screen, flashcard location and name globes, info panel, flat-map geometry fixes
    flashcards/     # FSRS per question (fsrs.ts), per-country progress and next-card choice (deck.ts), capital and country-name checks, typed-answer reveal, card UI
  shared/
    countries.ts    # country outlines + ISO codes from world-atlas
    countryFacts.ts # typed access to countries.json
    statRanges.ts   # named ranges for population, area and IHDI
    progress.ts     # flashcard progress (per country, per question) in localStorage
    settings.ts     # which question types are learned (Settings), in localStorage
    discoveries.ts  # when each country was first seen, for the Passport, in localStorage
    passportSort.ts # the Passport's last sort choice, in localStorage
    reviewLog.ts    # every flashcard answer, for tuning FSRS later, in localStorage
    BackButton.tsx  # "← Menu" button used by each screen
scripts/            # one-off asset generation (background map tiles, country facts, country pictures, app icon)
android/            # Capacitor's native Android project (mostly generated)
```

## Performance guidelines (Android WebView)
- Let MapLibre handle level of detail: pass full-detail borders and tiled imagery, not single large images or pre-simplified geometry.
- Cap the device pixel ratio: 1.5 on touch devices, 2 otherwise.
- Only set up hover handling on devices that can hover.
- Lazy-load the globe screen, and the flashcards' location and name globes, so the rest of the flashcards stay fast.

## Status
- Done: MapLibre globe with satellite imagery that flattens into a map when zoomed in. Tapping a country highlights it and shows its facts (names, capitals, population, area, IHDI); tapping the ocean closes the panel.
- Done: country facts dataset (`src/data/countries.json`), shown as named ranges.
- Done: main menu and flashcards with FSRS scheduling and saved progress.
- Done: Settings screen choosing which information is learned.
- Done: flashcard location question on the globe (`LocateCountryGlobe.tsx`); graded out of 5. Not yet checked on a real phone or emulator.
- Done: flashcard name question (`NameCountryGlobe.tsx`), alternating at random with the location question. Not yet checked on a phone, in particular how the bottom panel sits above the on-screen keyboard.
- Done: country pictures for all 195 countries, shown on the flashcards.
- Done: Capacitor Android project; debug APK runs on the emulator (menu, globe and flashcards checked).
- Done: app icon (a person whose head is a globe), drawn by `node scripts/make-app-icon.mjs` into `android/app/src/main/res/mipmap-*/` (Android) and `public/favicon.svg` + `public/apple-touch-icon.png` (website), and committed.
- Next: range boundaries page. Later for Android: release signing keystore (keep it backed up, never commit it).
- Todo: check the estimated IHDIs (`ihdiEstimate`) that may be wrong, then either hand-enter real values from other sources or skip their IHDI flashcard question. Likely too low: Turkmenistan, Uzbekistan (post-Soviet states come in above the line). Likely too high: Caribbean countries (Dominica, Grenada, St Vincent, St Kitts, Antigua, Cuba, Guyana, Suriname, Trinidad, Belize) and Equatorial Guinea. Within 0.01 of a title boundary: Guyana, Micronesia, Liechtenstein, Kuwait, Antigua. Least doubtful: Qatar, Bahrain, Saudi Arabia, Eritrea, San Marino.
- Note: requires npm 11+ (developed on Node 24 / npm 11.19.1). npm 10.9.2 crashes resolving Vitest 5's peer dependencies; on npm 10, install with `npx npm@11 install`.
