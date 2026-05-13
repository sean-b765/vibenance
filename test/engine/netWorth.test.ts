import { describe, expect, it } from 'vitest'
import { compute } from '@/core/engine/netWorth'
import type { Asset } from '@/core/schemas/asset'
import type { Liability } from '@/core/schemas/liability'

const baseAsset = (overrides: Partial<Asset>): Asset => ({
  id: '00000000-0000-7000-8000-000000000001',
  name: 'Test Asset',
  type: 'account_cash',
  startDate: '2026-01-01T00:00:00.000Z',
  snapshots: [],
  growth: { type: 'simple', rate: 0 },
  tagIds: [],
  ...overrides,
})

const baseLiability = (overrides: Partial<Liability>): Liability => ({
  id: '00000000-0000-7000-8000-000000000002',
  name: 'Test Liability',
  type: 'mortgage',
  startDate: '2026-01-01T00:00:00.000Z',
  snapshots: [],
  interest: { type: 'simple', rate: 0 },
  repayment: 0,
  paymentFrequency: { kind: 'monthly' },
  sourceAccountId: '00000000-0000-7000-8000-000000000003',
  tagIds: [],
  ...overrides,
})

describe('netWorth.compute', () => {
  it('returns 0 for empty entity lists', () => {
    expect(compute([], [], '2026-06-01T00:00:00.000Z')).toBe(0)
  })

  it('sums asset values from latest snapshots on or before the date', () => {
    const assets: Asset[] = [
      baseAsset({
        id: 'a1',
        snapshots: [
          { date: '2026-01-01T00:00:00.000Z', value: 1000, actual: true },
          { date: '2026-03-01T00:00:00.000Z', value: 1500, actual: true },
        ],
      }),
    ]
    expect(compute(assets, [], '2026-02-15T00:00:00.000Z')).toBe(1000)
    expect(compute(assets, [], '2026-06-01T00:00:00.000Z')).toBe(1500)
  })

  it('subtracts liability balances from asset totals', () => {
    const assets: Asset[] = [
      baseAsset({
        id: 'a1',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 100_000, actual: true }],
      }),
    ]
    const liabilities: Liability[] = [
      baseLiability({
        id: 'l1',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 30_000, actual: true }],
      }),
    ]
    expect(compute(assets, liabilities, '2026-06-01T00:00:00.000Z')).toBe(70_000)
  })

  it('treats entities with no snapshots on or before the date as contributing 0', () => {
    const assets: Asset[] = [
      baseAsset({
        id: 'a1',
        snapshots: [{ date: '2027-01-01T00:00:00.000Z', value: 1000, actual: true }],
      }),
    ]
    expect(compute(assets, [], '2026-06-01T00:00:00.000Z')).toBe(0)
  })

  it('returns a negative number when liabilities exceed assets', () => {
    const liabilities: Liability[] = [
      baseLiability({
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 500_000, actual: true }],
      }),
    ]
    expect(compute([], liabilities, '2026-06-01T00:00:00.000Z')).toBe(-500_000)
  })

  it('aggregates multiple assets and liabilities correctly', () => {
    const assets: Asset[] = [
      baseAsset({
        id: 'a1',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 5_000, actual: true }],
      }),
      baseAsset({
        id: 'a2',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 80_000, actual: true }],
      }),
      baseAsset({
        id: 'a3',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 900_000, actual: true }],
      }),
    ]
    const liabilities: Liability[] = [
      baseLiability({
        id: 'l1',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 600_000, actual: true }],
      }),
      baseLiability({
        id: 'l2',
        snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 10_000, actual: true }],
      }),
    ]
    expect(compute(assets, liabilities, '2026-06-01T00:00:00.000Z')).toBe(375_000)
  })
})
