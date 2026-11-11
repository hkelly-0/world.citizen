import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import jetBrainsMonoLicence from '../../assets/fonts/jetbrains-mono-OFL.txt?raw'
import robotoMonoLicence from '../../assets/fonts/roboto-mono-OFL.txt?raw'
import { BackButton } from '../../shared/BackButton'
// The main menu's centred column layout, with the cards shared with Settings.
import '../menu/MainMenu.css'
import '../../shared/OptionsPage.css'
import './Credits.css'

// Written by each build, listing exactly what it bundled: see build.license in
// vite.config.ts. A separate file, so its text stays out of the main bundle.
const LIBRARY_LICENCES_URL = '/third-party-licences.md'

const CC_BY_IGO_URL = 'https://creativecommons.org/licenses/by/3.0/igo/'

// Opens outside the app: in a new tab on the website, in the phone's browser
// in the APK.
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

// A licence's full text, closed until tapped as most are long.
function LicenceText({ title, text }: { title: string; text: string }) {
  return (
    <details className="credits__licence">
      <summary className="credits__licence-title">{title}</summary>
      <pre className="credits__licence-text">{text}</pre>
    </details>
  )
}

// Who made the data, imagery, fonts and libraries in the app, with the credit
// and licence notices that their licences ask to go with every copy. CREDITS.md
// says the same for the repo, so change both together.
export function Credits({ onBack }: { onBack: () => void }) {
  // The dev server has no build's file to fetch, and would answer with the app's
  // own page instead.
  const [libraryLicences, setLibraryLicences] = useState(
    import.meta.env.DEV ? 'Only listed in the website and APK builds.' : 'Loading…',
  )

  // #root is what scrolls (see index.css) and it stays scrolled between screens.
  // Credits' button is at the bottom of Settings, so this would otherwise open
  // part way down, with the title and back button out of sight.
  useLayoutEffect(() => {
    document.getElementById('root')?.scrollTo?.(0, 0)
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) return
    fetch(LIBRARY_LICENCES_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`)
        return response.text()
      })
      .then(setLibraryLicences)
      .catch(() => setLibraryLicences('The licences could not be loaded.'))
  }, [])

  return (
    <main className="main-menu options-page">
      <BackButton onClick={onBack} label="← Settings" />
      <h1 className="options-page__title">Credits</h1>

      <section className="options-page__section">
        <h2 className="options-page__heading">Country data</h2>
        <div className="options-page__card">
          <p className="credits__entry">
            <strong>Names, capitals and area:</strong> contains information from{' '}
            <ExternalLink href="https://github.com/mledoze/countries">
              mledoze/countries
            </ExternalLink>
            , which is made available here under the{' '}
            <ExternalLink href="https://opendatacommons.org/licenses/odbl/1-0/">
              Open Database License (ODbL) 1.0
            </ExternalLink>
            . Only the 197 countries are kept, and a few missing second capitals are added.
          </p>
          <p className="credits__entry">
            <strong>Population:</strong> United Nations, Department of Economic and Social Affairs,
            Population Division (2024),{' '}
            <ExternalLink href="https://population.un.org/wpp/">
              World Population Prospects 2024
            </ExternalLink>
            , under <ExternalLink href={CC_BY_IGO_URL}>CC BY 3.0 IGO</ExternalLink>. Uses the 2025
            medium-variant projection, shown rounded and as named ranges.
          </p>
          <p className="credits__entry">
            <strong>HDI and IHDI:</strong> United Nations Development Programme,{' '}
            <ExternalLink href="https://hdr.undp.org/">Human Development Report 2025</ExternalLink>,
            under <ExternalLink href={CC_BY_IGO_URL}>CC BY 3.0 IGO</ExternalLink>. Uses each
            country's latest year, shown rounded and as named ranges. Values marked as estimated are
            this app's own estimates from HDI, not UNDP figures.
          </p>
          <p className="credits__entry">
            The UN and UNDP don't endorse this app, and its data may not reflect their latest
            updates.
          </p>
        </div>
      </section>

      <section className="options-page__section">
        <h2 className="options-page__heading">Maps and imagery</h2>
        <div className="options-page__card">
          <p className="credits__entry">
            <strong>Borders:</strong> made with{' '}
            <ExternalLink href="https://www.naturalearthdata.com/">Natural Earth</ExternalLink>{' '}
            (public domain), by way of{' '}
            <ExternalLink href="https://github.com/topojson/world-atlas">world-atlas</ExternalLink>.
          </p>
          <p className="credits__entry">
            <strong>Satellite imagery:</strong> Blue Marble: Next Generation, June 2004, by Reto
            Stöckli,{' '}
            <ExternalLink href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/">
              NASA Earth Observatory
            </ExternalLink>
            . Cut into map tiles for this app. NASA doesn't endorse this app.
          </p>
          <p className="credits__entry">
            <strong>Population lights:</strong> Schiavina, Freire, Carioli and MacManus (2023),{' '}
            <ExternalLink href="https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE">
              GHS-POP R2023A
            </ExternalLink>
            , European Commission, Joint Research Centre, under{' '}
            <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">
              CC BY 4.0
            </ExternalLink>
            . The 2025 grid is drawn as randomly placed dots of light and cut into map tiles. The
            European Commission doesn't endorse this app.
          </p>
          <p className="credits__entry">
            <strong>Flags:</strong>{' '}
            <ExternalLink href="https://github.com/hampusborgos/country-flags">
              hampusborgos/country-flags
            </ExternalLink>
            , described by that project as public domain and sourced from Wikimedia Commons.
          </p>
        </div>
      </section>

      <section className="options-page__section">
        <h2 className="options-page__heading">Written content</h2>
        <div className="options-page__card">
          <p className="credits__entry">
            The country background text and native capital names were mostly drafted by Claude, an
            AI model, and may contain mistakes.
          </p>
        </div>
      </section>

      <section className="options-page__section">
        <h2 className="options-page__heading">Licences</h2>
        <div className="options-page__card">
          <LicenceText title="Libraries and Roboto Mono" text={libraryLicences} />
          <LicenceText title="Roboto Mono symbols" text={robotoMonoLicence} />
          <LicenceText title="JetBrains Mono symbols" text={jetBrainsMonoLicence} />
        </div>
      </section>
    </main>
  )
}
