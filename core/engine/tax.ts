import type { TaxBracket } from '@/core/schemas/settings'

export const applyMarginalBrackets = (income: number, brackets: TaxBracket[]): number => {
  if (income <= 0 || brackets.length === 0) return 0

  let tax = 0
  let lowerBound = 0

  for (const bracket of brackets) {
    const upper = bracket.upTo ?? Number.POSITIVE_INFINITY
    if (income <= lowerBound) break
    const taxableInBracket = Math.min(income, upper) - lowerBound
    tax += taxableInBracket * bracket.rate
    lowerBound = upper
    if (income <= upper) break
  }

  return tax
}
