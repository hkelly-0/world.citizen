import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { formatElapsedTime, NAMING_AREAS } from './namingGame'
import { formatScoreDate, loadNamingScores } from './namingScores'
// Same layout as the main menu.
import '../menu/MainMenu.css'
import './NamingAreaMenu.css'

type NamingAreaMenuProps = {
  onBack: () => void
  // Opens Name every country for the chosen area's id.
  onOpenNameEveryCountry: (areaId: string) => void
}

// Shown when Name Every Country is chosen on the Extras menu: a list to pick
// the area to play it in, starting on The World, and Go to start the game.
// The title finishes in the list ("Name Every Country in… Europe"), so it
// labels it. Below, "Previous Scores: Europe" (for example) lists the chosen
// area's rounds, most recent first, with their date, hints, score, and
// stopwatch time.
export function NamingAreaMenu({ onBack, onOpenNameEveryCountry }: NamingAreaMenuProps) {
  const [areaId, setAreaId] = useState(NAMING_AREAS[0].id)
  const scores = loadNamingScores(areaId)
  const areaName = NAMING_AREAS.find((area) => area.id === areaId)?.name

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1 id="naming-area-menu-title">Name Every Country in</h1>
      <select
        className="naming-area-menu__choice"
        aria-labelledby="naming-area-menu-title"
        value={areaId}
        onChange={(event) => setAreaId(event.target.value)}
      >
        {NAMING_AREAS.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <button
        className="naming-area-menu__go arrow-button"
        onClick={() => onOpenNameEveryCountry(areaId)}
      >
        Go
      </button>
      <section className="naming-area-menu__scores" aria-labelledby="naming-area-menu-scores-title">
        <h2 id="naming-area-menu-scores-title">Previous Scores: {areaName}</h2>
        {scores.length === 0 ? (
          <p className="naming-area-menu__no-scores">No games yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hints</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.endedAt}>
                  <td>{formatScoreDate(score.endedAt)}</td>
                  <td>{score.hintCount}</td>
                  <td>
                    {score.namedCount}/{score.countryCount}
                  </td>
                  {/* A hyphen for a round played without the stopwatch. */}
                  <td>{score.elapsedMs === null ? '-' : formatElapsedTime(score.elapsedMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
