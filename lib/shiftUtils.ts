/**
 * Returns the "shift date" (YYYY-MM-DD) for a given timestamp.
 * Events before 05:00 AM belong to the previous calendar day's shift.
 */
export function getShiftDate(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 5) {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }
  return date.toISOString().split('T')[0]
}

export function getMonthBounds(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

export function getQuarterStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().split('T')[0]
}

export function getMonthStart(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}
