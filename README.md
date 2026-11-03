# world.citizen

A geography learning app for the 195 countries (193 UN members plus Vatican City and Palestine). It runs as a website and as an Android app, both built from the same web code, and works offline with all its data bundled.

## What's in it

- **Flashcards:** learn each country's location, flag, area, population, inequality-adjusted human development (IHDI), capital and background. Spaced repetition (FSRS) measures how well you know each question, and new countries arrive one group of neighbours at a time.
- **Multi-country questions:** match flags and capitals, put countries in order by population, area or IHDI, and name a country's land neighbours.
- **Globe:** explore a satellite globe, search for places, and tap a country to read about it.
- **Passport:** see the countries you've discovered and how well you know each one.
- **Name every country:** type every country in the world, or in one continent, against the globe.

Progress is stored only on your device. There are no accounts or servers.

## Running it

You need Node 24+ and npm 11+.

```sh
npm install
npm run dev
```

| Command           | What it does                        |
| ----------------- | ----------------------------------- |
| `npm run build`   | Type-checks and builds the website  |
| `npm run preview` | Serves the production build locally |
| `npm test`        | Runs the tests                      |
| `npm run lint`    | Runs oxlint                         |
| `npm run format`  | Formats the code with Prettier      |

## Building the Android app

You need Android Studio, or a Java 21 JDK to build from the command line.

```sh
npm run android:sync          # Build the web app and copy it into android/
npx cap open android          # Open it in Android Studio
```

Or, from the command line:

```sh
cd android && ./gradlew assembleDebug
```

Release builds are only signed if you have the keystore, which isn't in this repo.

## Project layout

- `src/features/`: one folder per screen
- `src/shared/`: logic and saved data used across screens
- `src/data/`: country facts and other bundled data
- `public/`: flags, country pictures and satellite map tiles
- `scripts/`: the scripts that generate the committed data, each listing its sources

## About the content

- The country background text in `src/data/countryInfo/` was mostly drafted by AI and hasn't all been fact-checked, so it may contain mistakes. Please don't rely on it as a reference.
- Some IHDI values are estimated from HDI, for countries with no published figure. The app marks these as estimated.
- The list of countries and the map's borders are practical choices for a learning app, not statements on any country's status or on any disputed border.

## Licence

This project has no open-source licence. Copyright Hugh Kelly, all rights reserved. You're welcome to read the code and fork it on GitHub, but you may not otherwise copy, change or redistribute it without permission.

Third-party data, images, fonts and libraries keep their own licences, and this includes some of the country data. See [CREDITS.md](CREDITS.md).
