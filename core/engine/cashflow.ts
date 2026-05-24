import { applyRepayment } from '@/core/engine/loan'
import { isDue } from '@/core/engine/schedule'
import type { InterestState } from '@/core/engine/interest'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Transfer } from '@/core/schemas/transfer'

const REPAYABLE_LIABILITY_TYPES: ReadonlySet<Liability['type']> = new Set([
  'mortgage',
  'personal_loan',
  'car_loan',
])

export type AssetState = Map<string, InterestState>

const dayKey = (iso: string): string => iso.slice(0, 10)
const onSameDay = (a: string, b: string): boolean => dayKey(a) === dayKey(b)

const within = (startDate: string, endDate: string | undefined, day: string): boolean => {
  const d = Date.parse(day)
  if (d < Date.parse(startDate)) return false
  if (endDate && d > Date.parse(endDate)) return false
  return true
}

const credit = (state: AssetState, accountId: string, amount: number): void => {
  const s = state.get(accountId)
  if (!s) return
  state.set(accountId, { balance: s.balance + amount, accruedInterest: s.accruedInterest })
}

export const incomeDue = (income: Income, day: string): boolean => {
  if (!within(income.startDate, income.endDate, day)) return false
  if (!income.frequency) {
    return onSameDay(income.paymentDate ?? income.startDate, day)
  }
  return isDue(income.frequency, income.startDate, day)
}

export const expenseDue = (expense: Expense, day: string): boolean => {
  if (!within(expense.startDate, expense.endDate, day)) return false
  if (!expense.frequency) {
    return onSameDay(expense.paymentDate, day)
  }
  return isDue(expense.frequency, expense.startDate, day)
}

export const loanRepaymentDue = (liability: Liability, day: string): boolean => {
  if (!REPAYABLE_LIABILITY_TYPES.has(liability.type)) return false
  if (liability.repayment <= 0) return false
  if (!within(liability.startDate, liability.endDate, day)) return false
  return isDue(liability.paymentFrequency, liability.startDate, day)
}

export const transferDue = (transfer: Transfer, day: string): boolean => {
  if (!within(transfer.startDate, transfer.endDate, day)) return false
  if (transfer.type === 'one-off') return onSameDay(transfer.startDate, day)
  return isDue(transfer.frequency, transfer.startDate, day)
}

export const applyCashFlows = (
  day: string,
  scenario: {
    entities: { incomes: Income[]; expenses: Expense[]; transfers: Transfer[] }
  },
  assetState: AssetState,
): void => {
  for (const income of scenario.entities.incomes) {
    if (incomeDue(income, day)) credit(assetState, income.destinationAccountId, income.amount)
  }
  for (const expense of scenario.entities.expenses) {
    if (expenseDue(expense, day)) credit(assetState, expense.sourceAccountId, -expense.amount)
  }
  for (const transfer of scenario.entities.transfers) {
    if (transferDue(transfer, day)) {
      credit(assetState, transfer.sourceAccountId, -transfer.amount)
      credit(assetState, transfer.destinationAccountId, transfer.amount)
    }
  }
}

export type LiabilityState = Map<string, InterestState>

export const applyLoanRepayments = (
  day: string,
  scenario: { entities: { liabilities: Liability[] } },
  assetState: AssetState,
  liabilityState: LiabilityState,
): void => {
  for (const liability of scenario.entities.liabilities) {
    if (!loanRepaymentDue(liability, day)) continue
    const current = liabilityState.get(liability.id)
    if (!current) continue
    const result = applyRepayment(current, liability.repayment)
    const actualDebit = result.interestPaid + result.principalPaid
    if (actualDebit > 0) credit(assetState, liability.sourceAccountId, -actualDebit)
    liabilityState.set(liability.id, {
      balance: result.newBalance,
      accruedInterest: result.remainingAccrued,
    })
  }
}
