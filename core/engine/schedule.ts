import type { Frequency } from '@/core/schemas/frequency'

const MS_PER_DAY = 86_400_000

const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)

const lastDayOfMonthUtc = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

export const isDue = (frequency: Frequency, startDate: string, date: string): boolean => {
  const start = new Date(startDate)
  const current = new Date(date)

  if (current.getTime() < start.getTime()) return false

  switch (frequency.kind) {
    case 'daily':
      return true

    case 'weekly':
      return current.getUTCDay() === start.getUTCDay()

    case 'fortnightly':
      return daysBetween(start, current) % 14 === 0

    case 'monthly': {
      const targetDay = start.getUTCDate()
      const currentDay = current.getUTCDate()
      const lastDay = lastDayOfMonthUtc(current.getUTCFullYear(), current.getUTCMonth())
      const effectiveTarget = Math.min(targetDay, lastDay)
      return currentDay === effectiveTarget
    }

    case 'annually':
      return (
        current.getUTCMonth() === start.getUTCMonth() &&
        current.getUTCDate() === start.getUTCDate()
      )
  }
}
