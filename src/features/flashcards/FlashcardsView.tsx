import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { loadProgress, saveProgress } from '../../shared/progress'
import { todayString } from './dates'
import { chooseNextCountry, type DeckProgress } from './deck'
import { Flashcard } from './Flashcard'
import { gradeFromCorrectCount, reviewCard } from './sm2'
import './FlashcardsView.css'

const ALL_CODES = Object.keys(countryFacts)

type FlashcardsViewProps = {
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, chosen by SM-2,
// and saves progress after each card.
export function FlashcardsView({ onBack }: FlashcardsViewProps) {
  // Fixed while the screen is open, so a session past midnight stays consistent.
  const [today] = useState(todayString)
  const [progress, setProgress] = useState<DeckProgress>(loadProgress)
  // The country being shown, or null when there are no cards left today.
  const [currentCode, setCurrentCode] = useState<string | null>(() =>
    chooseNextCountry(ALL_CODES, progress, today),
  )

  function finishCard(code: string, correctCount: number) {
    const grade = gradeFromCorrectCount(correctCount)
    const newProgress = { ...progress, [code]: reviewCard(progress[code], grade, today) }
    setProgress(newProgress)
    saveProgress(newProgress)
    setCurrentCode(chooseNextCountry(ALL_CODES, newProgress, today))
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
          onFinish={(correctCount) => finishCard(currentCode, correctCount)}
        />
      )}
    </div>
  )
}
