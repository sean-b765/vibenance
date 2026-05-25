import { describe, expect, it } from 'vitest'
import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'
import {
  checkAsset,
  checkBurnRate,
  checkLiability,
  validateScenario,
} from '@/core/validation/warnings'

const UUID = '0193b8a0-0000-7000-8000-000000000000'
const UUID2 = '0193b8a0-0000-7000-8000-000000000001'

const mkAsset = (over: Partial<Asset> = {}): Asset => ({
  id: UUID,
  name: 'Cash',
  type: 'account_cash',
  startDate: '2025-01-01T00:00:00.000Z',
  snapshots: [],
  growth: { type: 'compounding', rate: 0 },
  tagIds: [],
  ...over,
})

const mkLiability = (over: Partial<Liability> = {}): Liability => ({
  id: UUID,
  name: 'Mortgage',
  type: 'mortgage',
  startDate: '2025-01-01T00:00:00.000Z',
  snapshots: [],
  interest: { type: 'compounding', rate: 0.05 },
  repayment: 1000,
  paymentFrequency: { kind: 'monthly' },
  sourceAccountId: UUID2,
  tagIds: [],
  ...over,
})

const mkIncome = (over: Partial<Income> = {}): Income => ({
  id: UUID,
  name: 'Salary',
  type: 'wage',
  amount: 5000,
  destinationAccountId: UUID2,
  frequency: { kind: 'monthly' },
  pretax: false,
  startDate: '2025-01-01T00:00:00.000Z',
  tagIds: [],
  ...over,
})

const mkExpense = (over: Partial<Expense> = {}): Expense => ({
  id: UUID,
  name: 'Rent',
  type: 'housing',
  amount: 1500,
  sourceAccountId: UUID2,
  frequency: { kind: 'monthly' },
  paymentDate: '2025-01-01T00:00:00.000Z',
  fixed: true,
  startDate: '2025-01-01T00:00:00.000Z',
  tagIds: [],
  ...over,
})

describe('W1 snapshot_negative', () => {
  it('flags cash account with negative snapshot', () => {
    const a = mkAsset({
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: -50, actual: true }],
    })
    const w = checkAsset(a)
    expect(w).toHaveLength(1)
    expect(w[0]?.code).toBe('snapshot_negative')
  })

  it('does not flag positive snapshot', () => {
    const a = mkAsset({
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: 100, actual: true }],
    })
    expect(checkAsset(a)).toHaveLength(0)
  })

  it('skips non-account asset types', () => {
    const a = mkAsset({
      type: 'property',
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: -50, actual: true }],
    })
    expect(checkAsset(a)).toHaveLength(0)
  })
})

describe('W7 negative_amortisation', () => {
  it('flags when repayment less than monthly accrual', () => {
    const l = mkLiability({
      interest: { type: 'compounding', rate: 0.12 },
      repayment: 100,
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: 100000, actual: true }],
    })
    const w = checkLiability(l, { assets: [mkAsset({ linkedLiabilityId: UUID })], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'negative_amortisation')).toBeDefined()
  })

  it('does not flag when repayment exceeds accrual', () => {
    const l = mkLiability({
      interest: { type: 'compounding', rate: 0.05 },
      repayment: 2000,
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: 100000, actual: true }],
    })
    const w = checkLiability(l, { assets: [mkAsset({ linkedLiabilityId: UUID })], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'negative_amortisation')).toBeUndefined()
  })
})

describe('W8 repayment_zero', () => {
  it('flags zero repayment with balance', () => {
    const l = mkLiability({
      repayment: 0,
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: 5000, actual: true }],
    })
    const w = checkLiability(l, { assets: [mkAsset({ linkedLiabilityId: UUID })], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'repayment_zero')).toBeDefined()
  })

  it('skips revolving credit card', () => {
    const l = mkLiability({
      type: 'credit_card',
      repayment: 0,
      creditCardRevolving: true,
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: 500, actual: true }],
    })
    const w = checkLiability(l, { assets: [], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'repayment_zero')).toBeUndefined()
  })

  it('does not flag zero repayment with zero balance', () => {
    const l = mkLiability({
      repayment: 0,
      snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: 0, actual: true }],
    })
    const w = checkLiability(l, { assets: [mkAsset({ linkedLiabilityId: UUID })], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'repayment_zero')).toBeUndefined()
  })
})

describe('W12 expense_exceeds_income', () => {
  it('flags when monthly expenses > monthly incomes', () => {
    const w = checkBurnRate('s1', 'Base', [mkIncome({ amount: 1000 })], [mkExpense({ amount: 2000 })])
    expect(w).toHaveLength(1)
    expect(w[0]?.code).toBe('expense_exceeds_income')
    expect(w[0]?.entityType).toBe('scenario')
  })

  it('normalises across frequencies', () => {
    const income = mkIncome({ amount: 12000, frequency: { kind: 'annually' } })
    const expense = mkExpense({ amount: 500, frequency: { kind: 'monthly' } })
    const w = checkBurnRate('s1', 'Base', [income], [expense])
    expect(w).toHaveLength(0)
  })

  it('skips one-off (no frequency)', () => {
    const income = mkIncome({ amount: 100, frequency: null, paymentDate: '2025-06-01T00:00:00.000Z' })
    const w = checkBurnRate('s1', 'Base', [income], [mkExpense({ amount: 1000 })])
    expect(w).toHaveLength(1)
  })
})

describe('W18 liability_orphan', () => {
  it('flags unlinked mortgage', () => {
    const l = mkLiability({ type: 'mortgage' })
    const w = checkLiability(l, { assets: [], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'liability_orphan')).toBeDefined()
  })

  it('does not flag linked mortgage', () => {
    const l = mkLiability({ type: 'mortgage', id: UUID })
    const a = mkAsset({ linkedLiabilityId: UUID, type: 'property' })
    const w = checkLiability(l, { assets: [a], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'liability_orphan')).toBeUndefined()
  })

  it('skips credit card', () => {
    const l = mkLiability({ type: 'credit_card' })
    const w = checkLiability(l, { assets: [], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'liability_orphan')).toBeUndefined()
  })

  it('skips personal loan', () => {
    const l = mkLiability({ type: 'personal_loan' })
    const w = checkLiability(l, { assets: [], liabilities: [], incomes: [], expenses: [] })
    expect(w.find((x) => x.code === 'liability_orphan')).toBeUndefined()
  })
})

describe('validateScenario', () => {
  it('aggregates warnings across entities', () => {
    const scenario: Scenario = {
      id: 's1',
      name: 'Base',
      colour: '#000000',
      favourite: false,
      horizonYears: 30,
      inflationRate: 0.025,
      entities: {
        assets: [
          mkAsset({
            snapshots: [{ date: '2025-02-01T00:00:00.000Z', value: -100, actual: true }],
          }),
        ],
        liabilities: [mkLiability({ type: 'mortgage' })],
        incomes: [],
        expenses: [],
        transfers: [],
      },
    }
    const w = validateScenario(scenario)
    expect(w.length).toBeGreaterThanOrEqual(2)
  })
})
