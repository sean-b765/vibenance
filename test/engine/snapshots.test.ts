import { describe, expect, it } from 'vitest'
import { latest } from '@/core/engine/snapshots'
import type { Snapshot } from '@/core/schemas/snapshot'

const snap = (date: string, value: number): Snapshot => ({ date, value, actual: true })

describe('snapshots.latest', () => {
  it('returns undefined for an empty list', () => {
    expect(latest([], '2026-01-01T00:00:00.000Z')).toBeUndefined()
  })

  it('returns undefined when no snapshot is on or before the target date', () => {
    const snapshots = [snap('2026-06-01T00:00:00.000Z', 1000)]
    expect(latest(snapshots, '2026-01-01T00:00:00.000Z')).toBeUndefined()
  })

  it('returns the only snapshot when it is on or before the target date', () => {
    const snapshots = [snap('2026-01-01T00:00:00.000Z', 1000)]
    expect(latest(snapshots, '2026-06-01T00:00:00.000Z')).toEqual(snapshots[0])
  })

  it('returns the most recent snapshot on or before the target date', () => {
    const snapshots = [
      snap('2025-01-01T00:00:00.000Z', 500),
      snap('2026-01-01T00:00:00.000Z', 800),
      snap('2026-06-01T00:00:00.000Z', 1100),
    ]
    expect(latest(snapshots, '2026-03-01T00:00:00.000Z')?.value).toBe(800)
  })

  it('handles unsorted input correctly', () => {
    const snapshots = [
      snap('2026-06-01T00:00:00.000Z', 1100),
      snap('2025-01-01T00:00:00.000Z', 500),
      snap('2026-01-01T00:00:00.000Z', 800),
    ]
    expect(latest(snapshots, '2026-03-01T00:00:00.000Z')?.value).toBe(800)
  })

  it('treats target date equal to a snapshot date as a match', () => {
    const snapshots = [snap('2026-01-01T00:00:00.000Z', 1000)]
    expect(latest(snapshots, '2026-01-01T00:00:00.000Z')?.value).toBe(1000)
  })
})
