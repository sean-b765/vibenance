import { describe, expect, it } from 'vitest'
import { assetSchema } from '@/core/schemas/asset'
import { expenseSchema } from '@/core/schemas/expense'
import { incomeSchema } from '@/core/schemas/income'
import { liabilitySchema } from '@/core/schemas/liability'

const uuid = () => '0193b8a0-0000-7000-8000-000000000000'

const baseAsset = {
  id: uuid(),
  name: 'Cash',
  type: 'account_cash' as const,
  startDate: '2025-01-01T00:00:00.000Z',
  snapshots: [],
  growth: { type: 'compounding' as const, rate: 0 },
  tagIds: [],
}

const baseLiability = {
  id: uuid(),
  name: 'Mortgage',
  type: 'mortgage' as const,
  startDate: '2025-01-01T00:00:00.000Z',
  snapshots: [],
  interest: { type: 'compounding' as const, rate: 0.05 },
  repayment: 1000,
  paymentFrequency: { kind: 'monthly' as const },
  sourceAccountId: uuid(),
  tagIds: [],
}

const baseIncome = {
  id: uuid(),
  name: 'Salary',
  type: 'wage' as const,
  amount: 5000,
  destinationAccountId: uuid(),
  frequency: { kind: 'monthly' as const },
  pretax: false,
  startDate: '2025-01-01T00:00:00.000Z',
  tagIds: [],
}

const baseExpense = {
  id: uuid(),
  name: 'Rent',
  type: 'housing',
  amount: 1500,
  sourceAccountId: uuid(),
  frequency: { kind: 'monthly' as const },
  paymentDate: '2025-01-01T00:00:00.000Z',
  fixed: true,
  startDate: '2025-01-01T00:00:00.000Z',
  tagIds: [],
}

describe('E2: startDate must be before endDate', () => {
  it('asset rejects endDate before startDate', () => {
    const r = assetSchema.safeParse({
      ...baseAsset,
      endDate: '2024-01-01T00:00:00.000Z',
    })
    expect(r.success).toBe(false)
  })

  it('asset accepts endDate after startDate', () => {
    const r = assetSchema.safeParse({
      ...baseAsset,
      endDate: '2026-01-01T00:00:00.000Z',
    })
    expect(r.success).toBe(true)
  })

  it('asset accepts missing endDate', () => {
    expect(assetSchema.safeParse(baseAsset).success).toBe(true)
  })

  it('liability rejects endDate before startDate', () => {
    const r = liabilitySchema.safeParse({
      ...baseLiability,
      endDate: '2024-01-01T00:00:00.000Z',
    })
    expect(r.success).toBe(false)
  })

  it('income rejects endDate before startDate', () => {
    const r = incomeSchema.safeParse({
      ...baseIncome,
      endDate: '2024-01-01T00:00:00.000Z',
    })
    expect(r.success).toBe(false)
  })

  it('expense rejects endDate before startDate', () => {
    const r = expenseSchema.safeParse({
      ...baseExpense,
      endDate: '2024-01-01T00:00:00.000Z',
    })
    expect(r.success).toBe(false)
  })
})

describe('E7: snapshot date must be on or after entity startDate', () => {
  it('asset rejects snapshot before startDate', () => {
    const r = assetSchema.safeParse({
      ...baseAsset,
      snapshots: [
        { date: '2024-12-31T00:00:00.000Z', value: 100, actual: true },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('asset accepts snapshot on startDate', () => {
    const r = assetSchema.safeParse({
      ...baseAsset,
      snapshots: [
        { date: '2025-01-01T00:00:00.000Z', value: 100, actual: true },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('liability rejects snapshot before startDate', () => {
    const r = liabilitySchema.safeParse({
      ...baseLiability,
      snapshots: [
        { date: '2024-12-31T00:00:00.000Z', value: 100, actual: true },
      ],
    })
    expect(r.success).toBe(false)
  })
})

describe('E8: income requires frequency XOR paymentDate', () => {
  it('rejects income with both frequency null and no paymentDate', () => {
    const r = incomeSchema.safeParse({
      ...baseIncome,
      frequency: null,
      paymentDate: undefined,
    })
    expect(r.success).toBe(false)
  })

  it('accepts income with frequency only', () => {
    const r = incomeSchema.safeParse({
      ...baseIncome,
      frequency: { kind: 'monthly' },
      paymentDate: undefined,
    })
    expect(r.success).toBe(true)
  })

  it('accepts income with paymentDate only (one-off)', () => {
    const r = incomeSchema.safeParse({
      ...baseIncome,
      frequency: null,
      paymentDate: '2025-06-01T00:00:00.000Z',
    })
    expect(r.success).toBe(true)
  })
})
