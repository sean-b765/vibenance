import { describe, expect, it } from 'vitest'
import { bucket } from '@/core/engine/series'

const point = (date: string, value: number) => ({ date, value })

describe('series.bucket', () => {
  it('returns the input unchanged for day buckets', () => {
    const series = [
      point('2026-01-01T00:00:00.000Z', 100),
      point('2026-01-02T00:00:00.000Z', 110),
      point('2026-01-03T00:00:00.000Z', 120),
    ]
    expect(bucket(series, 'day')).toEqual(series)
  })

  it('keeps the last point of each ISO week for week buckets', () => {
    const series = [
      point('2026-01-01T00:00:00.000Z', 100),
      point('2026-01-02T00:00:00.000Z', 110),
      point('2026-01-03T00:00:00.000Z', 120),
      point('2026-01-04T00:00:00.000Z', 130),
      point('2026-01-05T00:00:00.000Z', 140),
      point('2026-01-11T00:00:00.000Z', 200),
    ]
    const result = bucket(series, 'week')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(point('2026-01-04T00:00:00.000Z', 130))
    expect(result[1]).toEqual(point('2026-01-11T00:00:00.000Z', 200))
  })

  it('keeps the last point of each calendar month for month buckets', () => {
    const series = [
      point('2026-01-01T00:00:00.000Z', 100),
      point('2026-01-15T00:00:00.000Z', 110),
      point('2026-01-31T00:00:00.000Z', 120),
      point('2026-02-01T00:00:00.000Z', 125),
      point('2026-02-28T00:00:00.000Z', 130),
    ]
    expect(bucket(series, 'month')).toEqual([
      point('2026-01-31T00:00:00.000Z', 120),
      point('2026-02-28T00:00:00.000Z', 130),
    ])
  })

  it('returns empty array for empty input', () => {
    expect(bucket([], 'day')).toEqual([])
    expect(bucket([], 'week')).toEqual([])
    expect(bucket([], 'month')).toEqual([])
  })

  it('handles a single point in any bucket size', () => {
    const series = [point('2026-01-15T00:00:00.000Z', 100)]
    expect(bucket(series, 'day')).toEqual(series)
    expect(bucket(series, 'week')).toEqual(series)
    expect(bucket(series, 'month')).toEqual(series)
  })
})
