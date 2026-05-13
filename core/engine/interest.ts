import { isDue } from '@/core/engine/schedule'
import type { Frequency } from '@/core/schemas/frequency'
import type { Growth, RatePeriod } from '@/core/schemas/growth'

const DAYS_PER_YEAR = 365

const defaultCompoundingFrequency: Frequency = { kind: 'daily' }

export type InterestState = {
  balance: number
  accruedInterest: number
}

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

export const stepDay = (
  state: InterestState,
  growth: Growth,
  anchorDate: string,
  currentDate: string,
): InterestState => {
  const annualRate = rateAt(growth, currentDate)
  const dailyAccrual = state.balance * (annualRate / DAYS_PER_YEAR)
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
