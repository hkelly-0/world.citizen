# Credits

world.citizen is built on the work below. Each item keeps its own licence, whatever the licence status of the rest of this repo.

## Country data

`src/data/countries.json` and `src/data/territories.json` combine these sources:

- **Names, native names, capitals and area:** [mledoze/countries](https://github.com/mledoze/countries). Contains information from mledoze/countries, which is made available here under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Changes: only the 197 countries and the areas of the territories on the globe are kept, and a few missing second capitals are added (`EXTRA_CAPITALS` in `scripts/make-country-data.mjs`). This data stays available under the ODbL, and the rest of this repo's licence status doesn't restrict it.
- **Population:** United Nations, Department of Economic and Social Affairs, Population Division (2024), [World Population Prospects 2024](https://population.un.org/wpp/), used under [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). Changes: uses the 2025 medium-variant projection, shown rounded and as named ranges.
- **Territories the sources above leave out:** figures from national statistics offices and censuses, each source listed in `src/data/territoryFiguresByHand.json`.
- **HDI and IHDI:** United Nations Development Programme, [Human Development Report 2025](https://hdr.undp.org/), used under [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). Changes: uses each country's latest year, shown rounded and as named ranges. `ihdiEstimate` is this project's own least-squares estimate from HDI, not a UNDP figure, and the UNDP doesn't endorse this project.

The UN and UNDP sources don't endorse this project either, and its data may not reflect their latest updates.

## Maps and imagery

- **Country borders:** [Natural Earth](https://www.naturalearthdata.com/) 4.1.0 (public domain), by way of [world-atlas](https://github.com/topojson/world-atlas) (ISC licence, copyright 2013-2019 Michael Bostock). Made with Natural Earth.
- **Satellite imagery:** Blue Marble: Next Generation, June 2004, by Reto Stöckli, [NASA Earth Observatory](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/). Cut into map tiles for this app. NASA doesn't endorse this project.
- **Population lights:** Schiavina, Freire, Carioli and MacManus (2023), [GHS-POP R2023A](https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE), European Commission, Joint Research Centre, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes: the 2025 grid at 30 arcseconds is drawn as randomly placed dots of light and cut into map tiles. The European Commission doesn't endorse this project.
- **Flags:** [hampusborgos/country-flags](https://github.com/hampusborgos/country-flags), described by that project as public domain and sourced from Wikimedia Commons. National flags can have other legal restrictions on how they're used.

## Fonts

- **[Roboto Mono](https://github.com/googlefonts/RobotoMono):** Copyright 2015 The Roboto Mono Project Authors. Licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/). Used through [@fontsource/roboto-mono](https://github.com/fontsource/font-files), and subset for `src/assets/fonts/roboto-mono-symbols.woff2`.
- **[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono):** Copyright 2020 The JetBrains Mono Project Authors. Licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/). Subset for `src/assets/fonts/jetbrains-mono-symbols.woff2`.

## Libraries

| Library                                                                        | Used for                | Licence      |
| ------------------------------------------------------------------------------ | ----------------------- | ------------ |
| [React](https://react.dev/)                                                    | User interface          | MIT          |
| [MapLibre GL JS](https://maplibre.org/)                                        | Globe and maps          | BSD-3-Clause |
| [Capacitor](https://capacitorjs.com/)                                          | Android app             | MIT          |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)                   | Spaced repetition       | MIT          |
| [d3-geo](https://github.com/d3/d3-geo)                                         | Geographic calculations | ISC          |
| [topojson-client](https://github.com/topojson/topojson-client)                 | Reading border data     | ISC          |
| [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries) | Country code conversion | MIT          |

Development tools are listed in `package.json`.

## Hand-written and AI-written content

The country groups, continents, alternative names and territory descriptions in `src/data/` were written for this project. So was the text in `src/data/countryInfo/`, most of it drafted by [Claude](https://www.anthropic.com/claude), an AI model, as were the native capital names in `src/data/capitalNativeNames.json`. These may contain mistakes.
