/**
 * shiftUtils.ts
 *
 * All date calculations use the America/Sao_Paulo timezone
 * so they work correctly both locally AND on Vercel/Netlify
 * (whose servers run in UTC).
 */

const TZ = 'America/Sao_Paulo'

/** Returns the current date/time in Sao Paulo timezone as a Date-like object */
function nowInBrazil(date: Date = new Date()) {
  // Intl formatter gives us the individual date/time components in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(p => p.type === type)!.value
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    minute: parseInt(get('minute')),
    second: parseInt(get('second')),
  }
}

/**
 * Returns the "shift date" (YYYY-MM-DD) for a given timestamp.
 * Events before 05:00 AM (Brazil time) belong to the previous calendar day's shift.
 */
export function getShiftDate(date: Date = new Date()): string {
  const br = nowInBrazil(date)

  if (br.hour < 5) {
    // Belongs to previous day's shift
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    const prev = nowInBrazil(d)
    return `${prev.year}-${String(prev.month).padStart(2, '0')}-${String(prev.day).padStart(2, '0')}`
  }

  return `${br.year}-${String(br.month).padStart(2, '0')}-${String(br.day).padStart(2, '0')}`
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
  const br = nowInBrazil(d)
  return `${br.year}-${String(br.month).padStart(2, '0')}-${String(br.day).padStart(2, '0')}`
}

export function getMonthStart(): string {
  const br = nowInBrazil()
  return `${br.year}-${String(br.month).padStart(2, '0')}-01`
}

/**
 * Retorna a hora (0-23) no timezone do Brasil para um Date (útil para gráfico por hora).
 */
export function getBrazilHour(date: Date): number {
  return nowInBrazil(date).hour
}
