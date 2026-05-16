import { describe, expect, it } from 'vitest'
import { simulate } from '@/core/engine/simulation'
import type { Asset } from '@/core/schemas/asset'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'

const emptyEntities = {
  assets: [],
  liabilities: [],
  incomes: [],
  expenses: [],
  transfers: [],
}

const makeScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  id: '00000000-0000-7000-8000-000000000001',
  name: 'Test',
  colour: '#000000',
  favourite: false,
  horizonYears: 1,
  inflationRate: 0,
  entities: emptyEntities,
  ...overrides,
})

const cashAsset = (overrides: Partial<Asset>): Asset => ({
  id: 'a1',
  name: 'Cash',
  type: 'account_cash',
  startDate: '2026-01-01T00:00:00.000Z',
  snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 1_000, actual: true }],
  growth: { type: 'simple', rate: 0 },
  tagIds: [],
  ...overrides,
})

const mortgageLiability = (overrides: Partial<Liability>): Liability => ({
  id: 'l1',
  name: 'Mortgage',
  type: 'mortgage',
  startDate: '2026-01-01T00:00:00.000Z',
  snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 100_000, actual: true }],
  interest: { type: 'simple', rate: 0 },
  repayment: 0,
  paymentFrequency: { kind: 'monthly' },
  sourceAccountId: 'a1',
  tagIds: [],
  ...overrides,
})

describe('simulation.simulate', () => {
  it('produces one net-worth point per day across the range', () => {
    const scenario = makeScenario({
      entities: { ...emptyEntities, assets: [cashAsset({})] },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-05T00:00:00.000Z')
    expect(result.series).toHaveLength(5)
    expect(result.series[0]?.date).toBe('2026-01-01T00:00:00.000Z')
    expect(result.series[4]?.date).toBe('2026-01-05T00:00:00.000Z')
  })

  it('returns empty series when from is after to', () => {
    const scenario = makeScenario()
    const result = simulate(scenario, '2026-06-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    expect(result.series).toEqual([])
  })

  it('returns a flat net-worth series for an asset with zero growth', () => {
    const scenario = makeScenario({
      entities: { ...emptyEntities, assets: [cashAsset({})] },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-05T00:00:00.000Z')
    for (const point of result.series) {
      expect(point.value).toBe(1_000)
    }
  })

  it('grows net worth daily for a simple-interest asset (accrued contributes to value)', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ growth: { type: 'simple', rate: 0.05 } })],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z')
    // Day 1: snapshot day, no accrual yet → 1000
    // Day 2: one day accrued → 1000 + 1000*(0.05/365)
    // Day 3: two days accrued → 1000 + 2*(1000*(0.05/365))
    // Day 4: three days accrued
    expect(result.series[0]?.value).toBe(1_000)
    expect(result.series[1]?.value).toBeCloseTo(1_000 + 1 * (1_000 * (0.05 / 365)), 8)
    expect(result.series[2]?.value).toBeCloseTo(1_000 + 2 * (1_000 * (0.05 / 365)), 8)
    expect(result.series[3]?.value).toBeCloseTo(1_000 + 3 * (1_000 * (0.05 / 365)), 8)
  })

  it('compounds net worth daily for a daily-compounding asset', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [
          cashAsset({
            growth: {
              type: 'compounding',
              rate: 0.05,
              compoundingFrequency: { kind: 'daily' },
            },
          }),
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-31T00:00:00.000Z')
    // After N daily compounds: 1000 * (1 + 0.05/365)^N
    expect(result.series[0]?.value).toBe(1_000)
    expect(result.series[30]?.value).toBeCloseTo(1_000 * (1 + 0.05 / 365) ** 30, 6)
  })

  it('subtracts liability balances from net worth', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({})],
        liabilities: [mortgageLiability({})],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z')
    for (const point of result.series) {
      expect(point.value).toBe(1_000 - 100_000)
    }
  })

  it('treats entities with no snapshot on or before the start date as having balance 0', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [
          cashAsset({
            snapshots: [{ date: '2027-01-01T00:00:00.000Z', value: 1_000, actual: true }],
          }),
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z')
    for (const point of result.series) {
      expect(point.value).toBe(0)
    }
  })

  it('exposes per-entity daily series for assets and liabilities', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ id: 'a1', name: 'Cash' })],
        liabilities: [mortgageLiability({ id: 'l1', name: 'Mortgage' })],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z')
    expect(result.entities).toHaveLength(2)
    const cash = result.entities.find((e) => e.id === 'a1')
    const mortgage = result.entities.find((e) => e.id === 'l1')
    expect(cash?.kind).toBe('asset')
    expect(mortgage?.kind).toBe('liability')
    expect(cash?.points).toHaveLength(3)
    expect(mortgage?.points).toHaveLength(3)
    expect(cash?.points[0]?.value).toBe(1_000)
    expect(mortgage?.points[0]?.value).toBe(100_000)
  })

  it('accrues per-entity values matching their growth config', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ id: 'a1', growth: { type: 'simple', rate: 0.05 } })],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z')
    const a = result.entities.find((e) => e.id === 'a1')
    expect(a?.points[0]?.value).toBe(1_000)
    expect(a?.points[1]?.value).toBeCloseTo(1_000 + 1 * (1_000 * (0.05 / 365)), 8)
    expect(a?.points[3]?.value).toBeCloseTo(1_000 + 3 * (1_000 * (0.05 / 365)), 8)
  })

  it('per-entity series dates align with net-worth series', () => {
    const scenario = makeScenario({
      entities: { ...emptyEntities, assets: [cashAsset({})] },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-05T00:00:00.000Z')
    const a = result.entities[0]!
    expect(a.points.map((p) => p.date)).toEqual(result.series.map((p) => p.date))
  })

  it('weekly income deposits to its destination account over time', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ id: 'a1' })],
        incomes: [
          {
            id: 'i1',
            name: 'Wage',
            type: 'wage',
            amount: 1_000,
            pretax: false,
            destinationAccountId: 'a1',
            frequency: { kind: 'weekly' },
            startDate: '2026-01-01T00:00:00.000Z',
            tagIds: [],
          },
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-22T00:00:00.000Z')
    // 3 weekly deposits across the window (Jan 8, 15, 22)
    expect(result.series[0]?.value).toBe(1_000)
    expect(result.series[result.series.length - 1]?.value).toBe(1_000 + 3 * 1_000)
  })

  it('weekly expense debits its source account over time', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ id: 'a1' })],
        expenses: [
          {
            id: 'e1',
            name: 'Groceries',
            type: 'food',
            amount: 100,
            sourceAccountId: 'a1',
            frequency: { kind: 'weekly' },
            paymentDate: '2026-01-01T00:00:00.000Z',
            fixed: false,
            startDate: '2026-01-01T00:00:00.000Z',
            tagIds: [],
          },
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-22T00:00:00.000Z')
    expect(result.series[result.series.length - 1]?.value).toBe(1_000 - 3 * 100)
  })

  it('one-off income posts exactly once on its payment date', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ id: 'a1' })],
        incomes: [
          {
            id: 'i1',
            name: 'Inheritance',
            type: 'inheritance',
            amount: 50_000,
            pretax: false,
            destinationAccountId: 'a1',
            frequency: null,
            paymentDate: '2026-01-03T00:00:00.000Z',
            startDate: '2026-01-01T00:00:00.000Z',
            tagIds: [],
          },
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-10T00:00:00.000Z')
    expect(result.series[0]?.value).toBe(1_000)
    expect(result.series[2]?.value).toBe(1_000 + 50_000)
    expect(result.series[9]?.value).toBe(1_000 + 50_000)
  })

  it('per-entity series for the destination asset reflects deposits', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({ id: 'a1' })],
        incomes: [
          {
            id: 'i1',
            name: 'Wage',
            type: 'wage',
            amount: 500,
            pretax: false,
            destinationAccountId: 'a1',
            frequency: { kind: 'weekly' },
            startDate: '2026-01-01T00:00:00.000Z',
            tagIds: [],
          },
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z')
    const a = result.entities.find((e) => e.id === 'a1')!
    expect(a.points[0]?.value).toBe(1_000)
    expect(a.points[a.points.length - 1]?.value).toBe(1_000 + 2 * 500)
  })

  it('transfer shifts balance from source to destination', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [
          cashAsset({ id: 'a1' }),
          cashAsset({
            id: 'a2',
            snapshots: [{ date: '2026-01-01T00:00:00.000Z', value: 0, actual: true }],
          }),
        ],
        transfers: [
          {
            id: 't1',
            name: 'Save',
            type: 'one-off',
            sourceAccountId: 'a1',
            destinationAccountId: 'a2',
            amount: 300,
            frequency: { kind: 'monthly' },
            startDate: '2026-01-05T00:00:00.000Z',
            tagIds: [],
          },
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-10T00:00:00.000Z')
    const a1 = result.entities.find((e) => e.id === 'a1')!
    const a2 = result.entities.find((e) => e.id === 'a2')!
    expect(a1.points[a1.points.length - 1]?.value).toBe(700)
    expect(a2.points[a2.points.length - 1]?.value).toBe(300)
    // Net worth unchanged by a transfer.
    expect(result.series[result.series.length - 1]?.value).toBe(1_000)
  })

  it('accrues liability interest, increasing the debt over time', () => {
    const scenario = makeScenario({
      entities: {
        ...emptyEntities,
        assets: [cashAsset({})],
        liabilities: [
          mortgageLiability({ interest: { type: 'simple', rate: 0.06 } }),
        ],
      },
    })
    const result = simulate(scenario, '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z')
    const dailyLoanAccrual = 100_000 * (0.06 / 365)
    expect(result.series[0]?.value).toBe(1_000 - 100_000)
    expect(result.series[1]?.value).toBeCloseTo(1_000 - (100_000 + dailyLoanAccrual), 6)
    expect(result.series[3]?.value).toBeCloseTo(1_000 - (100_000 + 3 * dailyLoanAccrual), 6)
  })
})
