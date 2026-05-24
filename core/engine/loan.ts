import type { InterestState } from '@/core/engine/interest'
import { isDue } from '@/core/engine/schedule'
import type { Frequency } from '@/core/schemas/frequency'
import type { Growth, RatePeriod } from '@/core/schemas/growth'

const DAYS_PER_YEAR = 365
const defaultCompoundingFrequency: Frequency = { kind: 'daily' }

const isWithin = (period: RatePeriod, dateMs: number): boolean => {
  const start = Date.parse(period.startDate)
  if (dateMs < start) return false
  if (period.endDate === undefined) return true
  return dateMs < Date.parse(period.endDate)
}

const rateAt = (growth: Growth, date: string): number => {
  const dateMs = Date.parse(date)
  return growth.variableRates?.find((p) => isWithin(p, dateMs))?.rate ?? growth.rate
}

export type LoanState = {
  balance: number
  accruedInterest: number
}

export type RepaymentResult = {
  interestPaid: number
  principalPaid: number
  newBalance: number
  remainingAccrued: number
  overflow: number
}

export const effectiveBalance = (balance: number, offsetBalances: number[]): number => {
  const totalOffset = offsetBalances.reduce((sum, b) => sum + Math.max(b, 0), 0)
  return Math.max(balance - totalOffset, 0)
}

export const stepLoanDay = (
  state: InterestState,
  growth: Growth,
  offsetBalances: number[],
  anchorDate: string,
  currentDate: string,
): InterestState => {
  const accrualBase = effectiveBalance(state.balance, offsetBalances)
  const annualRate = rateAt(growth, currentDate)
  const dailyAccrual = accrualBase * (annualRate / DAYS_PER_YEAR)
  const newAccrued = state.accruedInterest + dailyAccrual

  if (growth.type !== 'compounding') {
    return { balance: state.balance, accruedInterest: newAccrued }
  }

  const compoundingFreq = growth.compoundingFrequency ?? defaultCompoundingFrequency
  if (!isDue(compoundingFreq, anchorDate, currentDate)) {
    return { balance: state.balance, accruedInterest: newAccrued }
  }

  return { balance: state.balance + newAccrued, accruedInterest: 0 }
}

export const applyRepayment = (state: LoanState, repayment: number): RepaymentResult => {
  if (repayment <= 0) {
    return {
      interestPaid: 0,
      principalPaid: 0,
      newBalance: state.balance,
      remainingAccrued: state.accruedInterest,
      overflow: 0,
    }
  }

  const interestPaid = Math.min(repayment, state.accruedInterest)
  const afterInterest = repayment - interestPaid
  const principalPaid = Math.min(afterInterest, state.balance)
  const overflow = afterInterest - principalPaid

  return {
    interestPaid,
    principalPaid,
    newBalance: state.balance - principalPaid,
    remainingAccrued: state.accruedInterest - interestPaid,
    overflow,
  }
}
