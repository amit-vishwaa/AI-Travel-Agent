export function formatCurrency(amount, currency = 'USD') {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return '-'

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(numeric)
  } catch {
    return `${(currency || 'USD').toUpperCase()} ${numeric.toLocaleString()}`
  }
}

export function summarizeBudgetsByCurrency(trips = []) {
  const totals = new Map()
  for (const trip of trips) {
    const currency = (trip?.currency || 'USD').toUpperCase()
    const amount = Number(trip?.budget || 0)
    if (!Number.isFinite(amount)) continue
    totals.set(currency, (totals.get(currency) || 0) + amount)
  }

  if (totals.size === 0) return '-'
  return [...totals.entries()]
    .map(([currency, total]) => formatCurrency(total, currency))
    .join(' + ')
}
