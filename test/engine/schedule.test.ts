import { describe, expect, it } from 'vitest'
import { isDue } from '@/core/engine/schedule'
import type { Frequency } from '@/core/schemas/frequency'

describe('schedule.isDue', () => {
  describe('daily', () => {
    const freq: Frequency = { kind: 'daily' }

    it('is due every day on or after the start date', () => {
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(true)
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z')).toBe(true)
    })

    it('is not due before the start date', () => {
      expect(isDue(freq, '2026-01-10T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false)
    })
  })

  describe('weekly', () => {
    const freq: Frequency = { kind: 'weekly' }

    it('is due on the same weekday as the start date', () => {
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z')).toBe(true)
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z')).toBe(true)
    })

    it('is not due on other weekdays', () => {
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-05T00:00:00.000Z')).toBe(false)
    })

    it('is due on the start date itself', () => {
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(true)
    })
  })

  describe('fortnightly', () => {
    const freq: Frequency = { kind: 'fortnightly' }

    it('is due every 14 days from the start date', () => {
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z')).toBe(true)
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-29T00:00:00.000Z')).toBe(true)
    })

    it('is not due on intermediate weekdays', () => {
      expect(isDue(freq, '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z')).toBe(false)
    })
  })

  describe('monthly', () => {
    const freq: Frequency = { kind: 'monthly' }

    it('is due on the same day-of-month as the start date', () => {
      expect(isDue(freq, '2026-01-15T00:00:00.000Z', '2026-02-15T00:00:00.000Z')).toBe(true)
      expect(isDue(freq, '2026-01-15T00:00:00.000Z', '2026-12-15T00:00:00.000Z')).toBe(true)
    })

    it('is not due on other days', () => {
      expect(isDue(freq, '2026-01-15T00:00:00.000Z', '2026-02-14T00:00:00.000Z')).toBe(false)
    })

    it('clamps to the last day when target month has fewer days', () => {
      expect(isDue(freq, '2026-01-31T00:00:00.000Z', '2026-02-28T00:00:00.000Z')).toBe(true)
    })
  })

  describe('annually', () => {
    const freq: Frequency = { kind: 'annually' }

    it('is due on the same month-day as the start date', () => {
      expect(isDue(freq, '2026-03-15T00:00:00.000Z', '2027-03-15T00:00:00.000Z')).toBe(true)
      expect(isDue(freq, '2026-03-15T00:00:00.000Z', '2030-03-15T00:00:00.000Z')).toBe(true)
    })

    it('is not due on other days', () => {
      expect(isDue(freq, '2026-03-15T00:00:00.000Z', '2027-03-16T00:00:00.000Z')).toBe(false)
    })
  })

  it('is not due before the start date for any frequency', () => {
    const frequencies: Frequency[] = [
      { kind: 'daily' },
      { kind: 'weekly' },
      { kind: 'fortnightly' },
      { kind: 'monthly' },
      { kind: 'annually' },
    ]
    for (const f of frequencies) {
      expect(isDue(f, '2026-06-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false)
    }
  })
})
