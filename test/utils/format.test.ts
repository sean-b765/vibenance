import { describe, expect, it } from 'vitest'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
} from '@/utils/format'

describe('formatCurrency', () => {
  it('formats AUD with two decimals and thousands separators', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-500)).toBe('-$500.00')
  })

  it('rounds to two decimals', () => {
    expect(formatCurrency(1.005)).toBe('$1.01')
  })
})

describe('formatCompactCurrency', () => {
  it('returns plain dollar values under 1000', () => {
    expect(formatCompactCurrency(450)).toBe('$450')
  })

  it('abbreviates thousands as K', () => {
    expect(formatCompactCurrency(1_500)).toBe('$2K')
    expect(formatCompactCurrency(450_000)).toBe('$450K')
  })

  it('abbreviates millions as M with one decimal', () => {
    expect(formatCompactCurrency(1_200_000)).toBe('$1.2M')
    expect(formatCompactCurrency(15_500_000)).toBe('$15.5M')
  })

  it('keeps sign on negatives', () => {
    expect(formatCompactCurrency(-1_200_000)).toBe('-$1.2M')
    expect(formatCompactCurrency(-450_000)).toBe('-$450K')
    expect(formatCompactCurrency(-50)).toBe('-$50')
  })
})

describe('formatPercent', () => {
  it('formats rate to two-decimal percent', () => {
    expect(formatPercent(0.025)).toBe('2.50%')
    expect(formatPercent(0.06)).toBe('6.00%')
  })

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.00%')
  })

  it('handles values >= 1', () => {
    expect(formatPercent(1.5)).toBe('150.00%')
  })
})

describe('formatDate', () => {
  it('formats ISO date in en-AU style', () => {
    const out = formatDate('2026-05-15T00:00:00.000Z')
    expect(out).toMatch(/\d{2} \w{3} 2026/)
  })
})
