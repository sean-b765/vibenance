import { describe, expect, it } from 'vitest'
import { realValue } from '@/core/engine/inflation'

describe('inflation.realValue', () => {
  it('returns nominal value when years is 0', () => {
    expect(realValue(1000, 0.025, 0)).toBe(1000)
  })

  it('returns nominal value when inflation is 0', () => {
    expect(realValue(1000, 0, 10)).toBe(1000)
  })

  it('discounts a future nominal amount by compounded inflation', () => {
    expect(realValue(1000, 0.025, 10)).toBeCloseTo(1000 / 1.025 ** 10, 6)
  })

  it('handles fractional years', () => {
    expect(realValue(1000, 0.03, 1.5)).toBeCloseTo(1000 / 1.03 ** 1.5, 6)
  })

  it('handles deflation (negative inflation rate)', () => {
    expect(realValue(1000, -0.01, 5)).toBeCloseTo(1000 / 0.99 ** 5, 6)
  })

  it('returns 0 for nominal value of 0', () => {
    expect(realValue(0, 0.025, 10)).toBe(0)
  })
})
