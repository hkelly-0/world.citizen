import type { CountryIcon } from '../../shared/settings'
import { BordersCard } from './BordersCard'
import { MatchingCard } from './MatchingCard'
import { ORDERING_STATS, type MultiCountryQuestion } from './multiCountryQuestions'
import { OrderingCard } from './OrderingCard'

type MultiCountryCardProps = {
  question: MultiCountryQuestion
  // Whether the Borders card shows the country's outline or flag, chosen in Settings.
  countryIcon: CountryIcon
  onFinish: () => void
}

// One multi-country question, shown with the card for its kind. Used both on
// its own in Custom Practice (MultiCountryPracticeView) and between the country
// cards in Classic and Custom Practice (FlashcardsView).
export function MultiCountryCard({ question, countryIcon, onFinish }: MultiCountryCardProps) {
  if (question.id === 'borders') {
    return <BordersCard code={question.codes[0]} countryIcon={countryIcon} onFinish={onFinish} />
  }
  if (question.id === 'flag-matching') {
    return <MatchingCard kind="flag" codes={question.codes} onFinish={onFinish} />
  }
  if (question.id === 'capital-matching') {
    return <MatchingCard kind="capital" codes={question.codes} onFinish={onFinish} />
  }
  return (
    <OrderingCard stat={ORDERING_STATS[question.id]} codes={question.codes} onFinish={onFinish} />
  )
}
