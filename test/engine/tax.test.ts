import { describe, expect, it } from 'vitest'
import { applyMarginalBrackets } from '@/core/engine/tax'
import type { TaxBracket } from '@/core/schemas/settings'

const brackets: TaxBracket[] = [
  { upTo: 18_200, rate: 0 },
  { upTo: 45_000, rate: 0.19 },
  { upTo: 135_000, rate: 0.3 },
  { upTo: 190_000, rate: 0.37 },
  { upTo: null, rate: 0.45 },
]

describe('tax.applyMarginalBrackets', () => {
  it('returns 0 tax for income at or below the first threshold', () => {
    expect(applyMarginalBrackets(15_000, brackets)).toBe(0)
    expect(applyMarginalBrackets(18_200, brackets)).toBe(0)
  })

  it('applies marginal rate within a single bracket', () => {
    expect(applyMarginalBrackets(30_000, brackets)).toBeCloseTo(2242, 6)
  })

  it('applies cumulative marginal rates across multiple brackets', () => {
    expect(applyMarginalBrackets(100_000, brackets)).toBeCloseTo(21_592, 6)
  })

  it('applies the topmost open-ended bracket for income above all thresholds', () => {
    expect(applyMarginalBrackets(250_000, brackets)).toBeCloseTo(79_442, 6)
  })

  it('returns 0 for zero or negative income', () => {
    expect(applyMarginalBrackets(0, brackets)).toBe(0)
    expect(applyMarginalBrackets(-1000, brackets)).toBe(0)
  })

  it('returns 0 when brackets array is empty', () => {
    expect(applyMarginalBrackets(100_000, [])).toBe(0)
  })

  it('handles a single open-ended bracket (flat tax)', () => {
    expect(applyMarginalBrackets(50_000, [{ upTo: null, rate: 0.2 }])).toBeCloseTo(10_000, 6)
  })
})
