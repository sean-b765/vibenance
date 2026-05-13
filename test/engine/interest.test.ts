import { describe, expect, it } from 'vitest'
import { stepDay } from '@/core/engine/interest'
import type { Growth } from '@/core/schemas/growth'

const anchor = '2026-01-01T00:00:00.000Z'

describe('interest.stepDay', () => {
  describe('simple interest', () => {
    const growth: Growth = { type: 'simple', rate: 0.05 }

    it('adds daily interest to the accrued bucket without changing the balance', () => {
      const result = stepDay(
        { balance: 1_000, accruedInterest: 0 },
        growth,
        anchor,
        '2026-01-02T00:00:00.000Z',
      )
      expect(result.balance).toBe(1_000)
      expect(result.accruedInterest).toBeCloseTo(1_000 * (0.05 / 365), 10)
    })

    it('accumulates accrued interest across multiple days', () => {
      let state = { balance: 1_000, accruedInterest: 0 }
      for (let i = 0; i < 30; i++) {
        state = stepDay(
          state,
          growth,
          anchor,
          `2026-01-${String(i + 2).padStart(2, '0')}T00:00:00.000Z`,
        )
      }
      expect(state.balance).toBe(1_000)
      expect(state.accruedInterest).toBeCloseTo(30 * 1_000 * (0.05 / 365), 8)
    })
  })

  describe('compounding interest', () => {
    it('compounds daily when frequency is daily', () => {
      const growth: Growth = {
        type: 'compounding',
        rate: 0.05,
        compoundingFrequency: { kind: 'daily' },
      }
      let state = { balance: 1_000, accruedInterest: 0 }
      for (let i = 0; i < 365; i++) {
        const day = new Date(Date.parse(anchor) + (i + 1) * 86_400_000).toISOString()
        state = stepDay(state, growth, anchor, day)
      }
      const expected = 1_000 * (1 + 0.05 / 365) ** 365
      expect(state.balance).toBeCloseTo(expected, 6)
    })

    it('accrues daily and capitalizes on the monthly anniversary day', () => {
      const growth: Growth = {
        type: 'compounding',
        rate: 0.05,
        compoundingFrequency: { kind: 'monthly' },
      }
      let state = { balance: 1_000, accruedInterest: 0 }
      for (let i = 2; i <= 31; i++) {
        const day = `2026-01-${String(i).padStart(2, '0')}T00:00:00.000Z`
        state = stepDay(state, growth, anchor, day)
      }
      state = stepDay(state, growth, anchor, '2026-02-01T00:00:00.000Z')
      const accruedBefore = 30 * 1_000 * (0.05 / 365)
      const accrualOnCapitalize = 1_000 * (0.05 / 365)
      expect(state.accruedInterest).toBe(0)
      expect(state.balance).toBeCloseTo(1_000 + accruedBefore + accrualOnCapitalize, 6)
    })

    it('defaults to daily compounding when frequency is omitted', () => {
      const growth: Growth = { type: 'compounding', rate: 0.05 }
      const result = stepDay(
        { balance: 1_000, accruedInterest: 0 },
        growth,
        anchor,
        '2026-01-02T00:00:00.000Z',
      )
      expect(result.accruedInterest).toBe(0)
      expect(result.balance).toBeCloseTo(1_000 * (1 + 0.05 / 365), 10)
    })
  })

  describe('variable rate lookup (internal)', () => {
    it('applies the variable rate when current date falls inside a defined period', () => {
      const growth: Growth = {
        type: 'simple',
        rate: 0.05,
        variableRates: [
          {
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-06-30T00:00:00.000Z',
            rate: 0.08,
          },
        ],
      }
      const result = stepDay(
        { balance: 1_000, accruedInterest: 0 },
        growth,
        anchor,
        '2026-03-15T00:00:00.000Z',
      )
      expect(result.accruedInterest).toBeCloseTo(1_000 * (0.08 / 365), 10)
    })

    it('falls back to the base rate when outside any variable period', () => {
      const growth: Growth = {
        type: 'simple',
        rate: 0.05,
        variableRates: [
          {
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-06-30T00:00:00.000Z',
            rate: 0.08,
          },
        ],
      }
      const result = stepDay(
        { balance: 1_000, accruedInterest: 0 },
        growth,
        anchor,
        '2026-07-15T00:00:00.000Z',
      )
      expect(result.accruedInterest).toBeCloseTo(1_000 * (0.05 / 365), 10)
    })

    it('treats variable endDate as exclusive', () => {
      const growth: Growth = {
        type: 'simple',
        rate: 0.05,
        variableRates: [
          {
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-06-30T00:00:00.000Z',
            rate: 0.08,
          },
        ],
      }
      const result = stepDay(
        { balance: 1_000, accruedInterest: 0 },
        growth,
        anchor,
        '2026-06-30T00:00:00.000Z',
      )
      expect(result.accruedInterest).toBeCloseTo(1_000 * (0.05 / 365), 10)
    })

    it('matches an open-ended variable period (no endDate)', () => {
      const growth: Growth = {
        type: 'simple',
        rate: 0.05,
        variableRates: [{ startDate: '2026-01-01T00:00:00.000Z', rate: 0.072 }],
      }
      const result = stepDay(
        { balance: 1_000, accruedInterest: 0 },
        growth,
        anchor,
        '2030-12-31T00:00:00.000Z',
      )
      expect(result.accruedInterest).toBeCloseTo(1_000 * (0.072 / 365), 10)
    })
  })
})
