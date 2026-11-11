import { BackButton } from '../../shared/BackButton'
import { ExternalLink } from '../../shared/ExternalLink'
// The main menu's centred column layout, with the cards shared with Settings.
import '../menu/MainMenu.css'
import '../../shared/OptionsPage.css'
import './WhatCountsAsCountry.css'

const SOVEREIGN_STATES_URL = 'https://en.wikipedia.org/wiki/List_of_sovereign_states'

// Opened from Extras: explains which 197 countries the app uses, and where
// the disputed territories on the globe fit in.
export function WhatCountsAsCountry({ onBack }: { onBack: () => void }) {
  return (
    <main className="main-menu options-page">
      <BackButton onClick={onBack} label="← Extras" />
      <h1 className="options-page__title">What counts as a country?</h1>
      <div className="options-page__section">
        <div className="options-page__card">
          <p className="what-counts__paragraph">Great question.</p>
          <p className="what-counts__paragraph">
            The most common count is 195: the 193 members of the United Nations, plus its 2 observer
            states, Palestine and Vatican City.
          </p>
          <p className="what-counts__paragraph">
            This app also includes Taiwan and Kosovo, as many lists do. Both are self-governing
            states, and some UN members recognize them while others don't. That makes 197.
          </p>
          <p className="what-counts__paragraph">
            Wikipedia's{' '}
            <ExternalLink href={SOVEREIGN_STATES_URL}>List of sovereign states</ExternalLink>{' '}
            currently has 205 entries. Beyond these 197, it includes self-declared states such as
            Somaliland, Northern Cyprus, and the Sahrawi Arab Democratic Republic (which claims
            Western Sahara). Some of these are on the Globe, with a short summary of their status,
            history, and peoples; they don't have flashcards.
          </p>
        </div>
      </div>
    </main>
  )
}
