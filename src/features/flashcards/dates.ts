// Dates are stored as "YYYY-MM-DD" strings in the user's local time zone, so a
// card due "tomorrow" becomes due at local midnight. Strings in this format
// also sort in date order, so they can be compared with < and >.

export function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function addDays(date: string, days: number): string {
  // Calculated in UTC so daylight-saving changes can't shift the date.
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
