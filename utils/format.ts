import { localeFor } from '@/core/i18n/currency'

let activeCurrency = 'AUD'
let activeLocale = 'en-AU'

const buildFmt = (currency: string, locale: string, compact = false) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    ...(compact ? { maximumFractionDigits: 1 } : {}),
  })

let fmt = buildFmt(activeCurrency, activeLocale)
let compactFmt = buildFmt(activeCurrency, activeLocale, true)

export const setActiveCurrency = (currency: string): void => {
  activeCurrency = currency
  activeLocale = localeFor(currency)
  fmt = buildFmt(activeCurrency, activeLocale)
  compactFmt = buildFmt(activeCurrency, activeLocale, true)
}

export const getActiveCurrency = (): string => activeCurrency

export const formatCurrency = (value: number): string => fmt.format(value)

export const formatCompactCurrency = (value: number): string => compactFmt.format(value)

export const formatPercent = (rate: number): string => `${(rate * 100).toFixed(2)}%`

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(activeLocale, { day: '2-digit', month: 'short', year: 'numeric' })
