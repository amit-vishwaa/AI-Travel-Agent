import { format, isValid, parseISO } from 'date-fns'

export function parseTripDate(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : new Date(value)
  return isValid(date) ? date : null
}

export function formatTripDate(value) {
  const date = parseTripDate(value)
  if (!date) return value || '—'
  return format(date, 'MMM d, yyyy')
}

export function formatTripRange(start, end) {
  const startDate = parseTripDate(start)
  const endDate = parseTripDate(end)
  if (!startDate || !endDate) return `${start || '—'} to ${end || '—'}`
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`
  }
  return `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`
}

export function tripDurationDays(start, end) {
  const startDate = parseTripDate(start)
  const endDate = parseTripDate(end)
  if (!startDate || !endDate) return 0
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
}
