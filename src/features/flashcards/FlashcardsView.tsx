import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { loadProgress, saveProgress } from '../../shared/progress'
import { todayString } from './dates'
import {
  chooseNextCountry,
  type CountryProgress,
  type DeckProgress,
  type GlobeKind,
  type QuestionId,
} from './deck'
import { Flashcard } from './Flashcard'
import { gradeFromAnswer, reviewQuestion } from './sm2'
import './FlashcardsView.css'

const ALL_CODES = Object.keys(countryFacts)

type FlashcardsViewProps = {
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // Which kinds of globe question may be asked, if the globe question is.
  globeKinds: GlobeKind[]
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, chosen by SM-2,
// and saves progress after each card. Only the questions in `questionIds` are
// asked, and only they decide which countries are due.
export function FlashcardsView({ questionIds, globeKinds, onBack }: FlashcardsViewProps) {
  // Fixed while the screen is open, so a session past midnight stays consistent.
  const [today] = useState(todayString)
  const [progress, setProgress] = useState<DeckProgress>(loadProgress)
  // The country being shown, or null when there are no cards left today.
  const [currentCode, setCurrentCode] = useState<string | null>(() =>
    chooseNextCountry(ALL_CODES, progress, today, questionIds),
  )

  // Each asked question gets its own SM-2 review, even ones that weren't due
  // yet. Questions not asked keep their progress.
  function finishCard(code: string, results: Partial<Record<QuestionId, boolean>>) {
    const newCountryProgress: CountryProgress = { ...progress[code] }
    for (const id of questionIds) {
      // Every asked question has a result once the card is finished.
      const isCorrect = results[id]!
      newCountryProgress[id] = reviewQuestion(progress[code]?.[id], gradeFromAnswer(isCorrect), today)
    }
    const newProgress = { ...progress, [code]: newCountryProgress }
    setProgress(newProgress)
    saveProgress(newProgress)
    setCurrentCode(chooseNextCountry(ALL_CODES, newProgress, today, questionIds))
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {currentCode === null ? (
        <p className="flashcards-view__done">No more cards today. Come back tomorrow!</p>
      ) : (
        // The key gives each country a fresh card, resetting its answers.
        <Flashcard
          key={currentCode}
          country={countryFacts[currentCode]}
          questionIds={questionIds}
          globeKinds={globeKinds}
          onFinish={(results) => finishCard(currentCode, results)}
        />
      )}
    </div>
  )
}
