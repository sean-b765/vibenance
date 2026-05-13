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
