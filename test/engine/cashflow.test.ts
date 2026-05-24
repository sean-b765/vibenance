import { describe, expect, it } from 'vitest'
import {
  applyCashFlows,
  applyLoanRepayments,
  expenseDue,
  incomeDue,
  loanRepaymentDue,
  transferDue,
} from '@/core/engine/cashflow'
import type { InterestState } from '@/core/engine/interest'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Transfer } from '@/core/schemas/transfer'

const ms = (iso: string) => iso
const state = (entries: [string, number][]): Map<string, InterestState> =>
  new Map(entries.map(([id, balance]) => [id, { balance, accruedInterest: 0 }]))

const baseIncome = (overrides: Partial<Income> = {}): Income => ({
  id: 'i1',
  name: 'Wage',
  type: 'wage',
  amount: 1000,
  pretax: false,
  destinationAccountId: 'a1',
  frequency: { kind: 'fortnightly' },
  startDate: ms('2026-01-01T00:00:00.000Z'),
  tagIds: [],
  ...overrides,
})

const baseExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e1',
  name: 'Groceries',
  type: 'food',
  amount: 200,
  sourceAccountId: 'a1',
  frequency: { kind: 'weekly' },
  paymentDate: ms('2026-01-01T00:00:00.000Z'),
  fixed: false,
  startDate: ms('2026-01-01T00:00:00.000Z'),
  tagIds: [],
  ...overrides,
})

const baseMortgage = (overrides: Partial<Liability> = {}): Liability => ({
  id: 'l1',
  name: 'Mortgage',
  type: 'mortgage',
  startDate: ms('2026-01-01T00:00:00.000Z'),
  snapshots: [{ date: ms('2026-01-01T00:00:00.000Z'), value: 100_000, actual: true }],
  interest: { type: 'simple', rate: 0 },
  repayment: 3_000,
  paymentFrequency: { kind: 'monthly' },
  sourceAccountId: 'a1',
  tagIds: [],
  ...overrides,
})

const baseTransfer = (overrides: Partial<Transfer> = {}): Transfer => ({
  id: 't1',
  name: 'Savings transfer',
  type: 'ongoing',
  sourceAccountId: 'a1',
  destinationAccountId: 'a2',
  amount: 500,
  frequency: { kind: 'monthly' },
  startDate: ms('2026-01-01T00:00:00.000Z'),
  tagIds: [],
  ...overrides,
})

const scenario = (
  incomes: Income[] = [],
  expenses: Expense[] = [],
  transfers: Transfer[] = [],
  liabilities: Liability[] = [],
) => ({
  entities: { incomes, expenses, transfers, liabilities },
})

describe('incomeDue', () => {
  it('returns true on the start date for matching cadence', () => {
    expect(incomeDue(baseIncome(), '2026-01-01T00:00:00.000Z')).toBe(true)
  })

  it('returns true exactly 14 days later for fortnightly', () => {
    expect(incomeDue(baseIncome(), '2026-01-15T00:00:00.000Z')).toBe(true)
  })

  it('returns false on intermediate days', () => {
    expect(incomeDue(baseIncome(), '2026-01-08T00:00:00.000Z')).toBe(false)
  })

  it('returns false before start date', () => {
    expect(incomeDue(baseIncome(), '2025-12-31T00:00:00.000Z')).toBe(false)
  })

  it('returns false after end date', () => {
    const i = baseIncome({ endDate: '2026-06-01T00:00:00.000Z' })
    expect(incomeDue(i, '2026-07-01T00:00:00.000Z')).toBe(false)
  })

  it('one-off income posts only on paymentDate', () => {
    const i = baseIncome({
      frequency: null,
      paymentDate: '2026-03-15T00:00:00.000Z',
    })
    expect(incomeDue(i, '2026-03-15T00:00:00.000Z')).toBe(true)
    expect(incomeDue(i, '2026-03-14T00:00:00.000Z')).toBe(false)
    expect(incomeDue(i, '2026-03-16T00:00:00.000Z')).toBe(false)
  })

  it('one-off income without paymentDate falls back to startDate', () => {
    const i = baseIncome({ frequency: null, startDate: '2026-02-10T00:00:00.000Z' })
    expect(incomeDue(i, '2026-02-10T00:00:00.000Z')).toBe(true)
    expect(incomeDue(i, '2026-02-11T00:00:00.000Z')).toBe(false)
  })
})

describe('expenseDue', () => {
  it('weekly expense posts on same weekday after startDate', () => {
    expect(expenseDue(baseExpense(), '2026-01-08T00:00:00.000Z')).toBe(true)
  })

  it('one-off expense posts only on paymentDate', () => {
    const e = baseExpense({
      frequency: null,
      paymentDate: '2026-04-01T00:00:00.000Z',
    })
    expect(expenseDue(e, '2026-04-01T00:00:00.000Z')).toBe(true)
    expect(expenseDue(e, '2026-04-02T00:00:00.000Z')).toBe(false)
  })
})

describe('transferDue', () => {
  it('one-off transfer posts only on startDate', () => {
    const t = baseTransfer({ type: 'one-off', startDate: '2026-06-01T00:00:00.000Z' })
    expect(transferDue(t, '2026-06-01T00:00:00.000Z')).toBe(true)
    expect(transferDue(t, '2026-07-01T00:00:00.000Z')).toBe(false)
  })

  it('ongoing transfer follows frequency from startDate', () => {
    expect(transferDue(baseTransfer(), '2026-02-01T00:00:00.000Z')).toBe(true)
  })
})

describe('loanRepaymentDue', () => {
  it('returns true on the start date for matching cadence', () => {
    expect(loanRepaymentDue(baseMortgage(), '2026-01-01T00:00:00.000Z')).toBe(true)
  })

  it('returns true exactly one month later for monthly', () => {
    expect(loanRepaymentDue(baseMortgage(), '2026-02-01T00:00:00.000Z')).toBe(true)
  })

  it('returns false on intermediate days', () => {
    expect(loanRepaymentDue(baseMortgage(), '2026-01-15T00:00:00.000Z')).toBe(false)
  })

  it('returns false before start date', () => {
    expect(loanRepaymentDue(baseMortgage(), '2025-12-15T00:00:00.000Z')).toBe(false)
  })

  it('returns false after end date', () => {
    const l = baseMortgage({ endDate: '2026-06-01T00:00:00.000Z' })
    expect(loanRepaymentDue(l, '2026-07-01T00:00:00.000Z')).toBe(false)
  })

  it('returns false for credit_card type (handled separately)', () => {
    const l = baseMortgage({ type: 'credit_card' })
    expect(loanRepaymentDue(l, '2026-01-01T00:00:00.000Z')).toBe(false)
  })

  it('returns false when repayment is 0', () => {
    expect(loanRepaymentDue(baseMortgage({ repayment: 0 }), '2026-01-01T00:00:00.000Z')).toBe(false)
  })
})

describe('applyCashFlows', () => {
  it('credits destination asset on income day', () => {
    const s = state([['a1', 0]])
    applyCashFlows(
      '2026-01-15T00:00:00.000Z',
      scenario([baseIncome({ amount: 1500 })]),
      s,
    )
    expect(s.get('a1')?.balance).toBe(1500)
  })

  it('debits source asset on expense day', () => {
    const s = state([['a1', 1000]])
    applyCashFlows('2026-01-08T00:00:00.000Z', scenario([], [baseExpense({ amount: 200 })]), s)
    expect(s.get('a1')?.balance).toBe(800)
  })

  it('moves balance between accounts on transfer day', () => {
    const s = state([
      ['a1', 1000],
      ['a2', 0],
    ])
    applyCashFlows('2026-02-01T00:00:00.000Z', scenario([], [], [baseTransfer({ amount: 500 })]), s)
    expect(s.get('a1')?.balance).toBe(500)
    expect(s.get('a2')?.balance).toBe(500)
  })

  it('does nothing on a non-due day', () => {
    const s = state([['a1', 1000]])
    applyCashFlows(
      '2026-01-02T00:00:00.000Z',
      scenario([baseIncome()], [baseExpense()], [baseTransfer()]),
      s,
    )
    expect(s.get('a1')?.balance).toBe(1000)
  })

  it('preserves accruedInterest when crediting', () => {
    const s = new Map([['a1', { balance: 0, accruedInterest: 12.34 }]])
    applyCashFlows('2026-01-15T00:00:00.000Z', scenario([baseIncome({ amount: 100 })]), s)
    expect(s.get('a1')).toEqual({ balance: 100, accruedInterest: 12.34 })
  })

  it('ignores cashflows that target an unknown account', () => {
    const s = state([['a1', 1000]])
    applyCashFlows(
      '2026-01-15T00:00:00.000Z',
      scenario([baseIncome({ destinationAccountId: 'missing' })]),
      s,
    )
    expect(s.get('a1')?.balance).toBe(1000)
  })
})

describe('applyLoanRepayments', () => {
  it('debits source account by interestPaid + principalPaid on payment day', () => {
    const assets = state([['a1', 10_000]])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 100_000, accruedInterest: 500 }],
    ])
    applyLoanRepayments(
      '2026-02-01T00:00:00.000Z',
      scenario([], [], [], [baseMortgage({ repayment: 3_000 })]),
      assets,
      liabilities,
    )
    expect(assets.get('a1')?.balance).toBe(7_000)
  })

  it('pays accrued interest first, then principal', () => {
    const assets = state([['a1', 10_000]])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 100_000, accruedInterest: 500 }],
    ])
    applyLoanRepayments(
      '2026-02-01T00:00:00.000Z',
      scenario([], [], [], [baseMortgage({ repayment: 3_000 })]),
      assets,
      liabilities,
    )
    expect(liabilities.get('l1')).toEqual({ balance: 97_500, accruedInterest: 0 })
  })

  it('does nothing on a non-due day', () => {
    const assets = state([['a1', 10_000]])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 100_000, accruedInterest: 500 }],
    ])
    applyLoanRepayments(
      '2026-01-15T00:00:00.000Z',
      scenario([], [], [], [baseMortgage()]),
      assets,
      liabilities,
    )
    expect(assets.get('a1')?.balance).toBe(10_000)
    expect(liabilities.get('l1')).toEqual({ balance: 100_000, accruedInterest: 500 })
  })

  it('absorbs overflow when repayment exceeds outstanding debt', () => {
    const assets = state([['a1', 10_000]])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 1_000, accruedInterest: 50 }],
    ])
    applyLoanRepayments(
      '2026-02-01T00:00:00.000Z',
      scenario([], [], [], [baseMortgage({ repayment: 3_000 })]),
      assets,
      liabilities,
    )
    expect(assets.get('a1')?.balance).toBe(10_000 - 1_050)
    expect(liabilities.get('l1')).toEqual({ balance: 0, accruedInterest: 0 })
  })

  it('skips credit_card liabilities', () => {
    const assets = state([['a1', 10_000]])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 2_000, accruedInterest: 0 }],
    ])
    applyLoanRepayments(
      '2026-02-01T00:00:00.000Z',
      scenario([], [], [], [baseMortgage({ type: 'credit_card', repayment: 500 })]),
      assets,
      liabilities,
    )
    expect(assets.get('a1')?.balance).toBe(10_000)
    expect(liabilities.get('l1')?.balance).toBe(2_000)
  })

  it('source account may go negative (no overdraft guard)', () => {
    const assets = state([['a1', 100]])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 100_000, accruedInterest: 0 }],
    ])
    applyLoanRepayments(
      '2026-02-01T00:00:00.000Z',
      scenario([], [], [], [baseMortgage({ repayment: 3_000 })]),
      assets,
      liabilities,
    )
    expect(assets.get('a1')?.balance).toBe(100 - 3_000)
  })

  it('preserves source accruedInterest when debiting', () => {
    const assets: Map<string, InterestState> = new Map([
      ['a1', { balance: 10_000, accruedInterest: 12.34 }],
    ])
    const liabilities: Map<string, InterestState> = new Map([
      ['l1', { balance: 100_000, accruedInterest: 0 }],
    ])
    applyLoanRepayments(
      '2026-02-01T00:00:00.000Z',
      scenario([], [], [], [baseMortgage({ repayment: 3_000 })]),
      assets,
      liabilities,
    )
    expect(assets.get('a1')).toEqual({ balance: 7_000, accruedInterest: 12.34 })
  })
})
