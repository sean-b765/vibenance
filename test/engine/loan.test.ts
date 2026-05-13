import { describe, expect, it } from 'vitest'
import { applyRepayment, effectiveBalance } from '@/core/engine/loan'

describe('loan.effectiveBalance', () => {
  it('returns the loan balance when no offsets are linked', () => {
    expect(effectiveBalance(500_000, [])).toBe(500_000)
  })

  it('subtracts a single linked offset balance', () => {
    expect(effectiveBalance(500_000, [80_000])).toBe(420_000)
  })

  it('subtracts the sum of multiple linked offset balances', () => {
    expect(effectiveBalance(500_000, [30_000, 20_000, 10_000])).toBe(440_000)
  })

  it('clamps the effective balance at 0 when offsets exceed the loan', () => {
    expect(effectiveBalance(50_000, [80_000])).toBe(0)
  })

  it('treats negative offset balances as 0', () => {
    expect(effectiveBalance(500_000, [-1000, 50_000])).toBe(450_000)
  })
})

describe('loan.applyRepayment', () => {
  it('pays accrued interest first, then principal', () => {
    const result = applyRepayment({ balance: 500_000, accruedInterest: 2_000 }, 3_000)
    expect(result.interestPaid).toBe(2_000)
    expect(result.principalPaid).toBe(1_000)
    expect(result.newBalance).toBe(499_000)
    expect(result.remainingAccrued).toBe(0)
    expect(result.overflow).toBe(0)
  })

  it('pays only interest when repayment is less than accrued interest', () => {
    const result = applyRepayment({ balance: 500_000, accruedInterest: 2_000 }, 1_500)
    expect(result.interestPaid).toBe(1_500)
    expect(result.principalPaid).toBe(0)
    expect(result.newBalance).toBe(500_000)
    expect(result.remainingAccrued).toBe(500)
    expect(result.overflow).toBe(0)
  })

  it('returns overflow when repayment exceeds outstanding debt', () => {
    const result = applyRepayment({ balance: 1_000, accruedInterest: 50 }, 2_000)
    expect(result.interestPaid).toBe(50)
    expect(result.principalPaid).toBe(1_000)
    expect(result.newBalance).toBe(0)
    expect(result.remainingAccrued).toBe(0)
    expect(result.overflow).toBe(950)
  })

  it('handles a zero repayment as a no-op', () => {
    const result = applyRepayment({ balance: 500_000, accruedInterest: 2_000 }, 0)
    expect(result.interestPaid).toBe(0)
    expect(result.principalPaid).toBe(0)
    expect(result.newBalance).toBe(500_000)
    expect(result.remainingAccrued).toBe(2_000)
    expect(result.overflow).toBe(0)
  })

  it('pays off the loan exactly with no overflow', () => {
    const result = applyRepayment({ balance: 1_000, accruedInterest: 50 }, 1_050)
    expect(result.newBalance).toBe(0)
    expect(result.remainingAccrued).toBe(0)
    expect(result.overflow).toBe(0)
  })

  it('returns overflow equal to repayment when debt is already 0', () => {
    const result = applyRepayment({ balance: 0, accruedInterest: 0 }, 500)
    expect(result.interestPaid).toBe(0)
    expect(result.principalPaid).toBe(0)
    expect(result.newBalance).toBe(0)
    expect(result.overflow).toBe(500)
  })
})
