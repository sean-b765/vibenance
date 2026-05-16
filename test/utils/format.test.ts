import { afterEach, describe, expect, it } from 'vitest'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  setActiveCurrency,
} from '@/utils/format'

afterEach(() => setActiveCurrency('AUD'))

describe('formatCurrency', () => {
  it('formats AUD with two decimals and thousands separators', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-500)).toMatch(/-\$500\.00/)
  })

  it('rounds to two decimals', () => {
    expect(formatCurrency(1.005)).toBe('$1.01')
  })

  it('formats USD with US locale', () => {
    setActiveCurrency('USD')
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats IDR with Indonesian locale (thousand separator dot)', () => {
    setActiveCurrency('IDR')
    expect(formatCurrency(2_000_000)).toContain('2.000.000')
  })

  it('formats EUR with German locale', () => {
    setActiveCurrency('EUR')
    expect(formatCurrency(1234.5)).toMatch(/1\.234,50/)
  })

  it('formats JPY without decimals', () => {
    setActiveCurrency('JPY')
    expect(formatCurrency(1500)).not.toContain('.')
  })
})

describe('formatCompactCurrency', () => {
  it('returns a compact AUD string for thousands', () => {
    expect(formatCompactCurrency(1_500)).toMatch(/1\.5K/)
  })

  it('abbreviates millions with one decimal', () => {
    expect(formatCompactCurrency(1_200_000)).toMatch(/1\.2M/)
  })

  it('keeps sign on negatives', () => {
    expect(formatCompactCurrency(-1_200_000)).toMatch(/-\$1\.2M/)
  })

  it('switches symbol with currency', () => {
    setActiveCurrency('EUR')
    expect(formatCompactCurrency(1_500_000)).toMatch(/€|EUR/)
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
  it('formats ISO date in active locale style', () => {
    const out = formatDate('2026-05-15T00:00:00.000Z')
    expect(out).toMatch(/\d{2} \w{3} 2026/)
  })
})
