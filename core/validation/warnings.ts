import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Frequency } from '@/core/schemas/frequency'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'
import type { WarningCode } from '@/core/i18n/warnings'

export type EntityType = 'asset' | 'liability' | 'income' | 'expense' | 'scenario'

export type Warning = {
  code: WarningCode
  messageKey: WarningCode
  messageParams?: Record<string, unknown>
  entityId: string
  entityName: string
  entityType: EntityType
  field?: string
}

export type ValidationContext = {
  assets: Asset[]
  liabilities: Liability[]
  incomes: Income[]
  expenses: Expense[]
}

const ACCOUNT_LIKE: Asset['type'][] = ['account_cash', 'account_savings', 'account_offset']

const paymentsPerYear = (f: Frequency): number => {
  switch (f.kind) {
    case 'daily':
      return 365
    case 'weekly':
      return 52
    case 'fortnightly':
      return 26
    case 'monthly':
      return 12
    case 'annually':
      return 1
  }
}

const monthlyAmount = (amount: number, f: Frequency): number =>
  (amount * paymentsPerYear(f)) / 12

const latestSnapshotValue = (snaps: { value: number }[]): number | null =>
  snaps.length > 0 ? (snaps[snaps.length - 1]?.value ?? null) : null

export const checkAsset = (asset: Asset): Warning[] => {
  const out: Warning[] = []
  if (!ACCOUNT_LIKE.includes(asset.type)) return out
  asset.snapshots.forEach((s, i) => {
    if (s.value < 0) {
      out.push({
        code: 'snapshot_negative',
        messageKey: 'snapshot_negative',
        entityId: asset.id,
        entityName: asset.name,
        entityType: 'asset',
        field: `snapshots.${i}.value`,
      })
    }
  })
  return out
}

export const checkLiability = (l: Liability, ctx: ValidationContext): Warning[] => {
  const out: Warning[] = []
  const balance = latestSnapshotValue(l.snapshots)

  if (l.repayment === 0 && balance !== null && balance > 0) {
    const skipRevolving = l.type === 'credit_card' && l.creditCardRevolving === true
    if (!skipRevolving) {
      out.push({
        code: 'repayment_zero',
        messageKey: 'repayment_zero',
        entityId: l.id,
        entityName: l.name,
        entityType: 'liability',
        field: 'repayment',
      })
    }
  }

  if (balance !== null && balance > 0 && l.repayment > 0) {
    const ppy = paymentsPerYear(l.paymentFrequency)
    const perPeriodAccrual = (balance * l.interest.rate) / ppy
    if (l.repayment < perPeriodAccrual) {
      out.push({
        code: 'negative_amortisation',
        messageKey: 'negative_amortisation',
        entityId: l.id,
        entityName: l.name,
        entityType: 'liability',
        field: 'repayment',
      })
    }
  }

  const LINKABLE: Liability['type'][] = ['mortgage', 'car_loan']
  if (LINKABLE.includes(l.type)) {
    const linked = ctx.assets.some((a) => a.linkedLiabilityId === l.id)
    if (!linked) {
      out.push({
        code: 'liability_orphan',
        messageKey: 'liability_orphan',
        messageParams: { type: l.type.replace('_', ' ') },
        entityId: l.id,
        entityName: l.name,
        entityType: 'liability',
      })
    }
  }

  return out
}

export const checkBurnRate = (
  scenarioId: string,
  scenarioName: string,
  incomes: Income[],
  expenses: Expense[],
): Warning[] => {
  const totalIncome = incomes
    .filter((i) => i.frequency)
    .reduce((sum, i) => sum + monthlyAmount(i.amount, i.frequency as Frequency), 0)
  const totalExpense = expenses
    .filter((e) => e.frequency)
    .reduce((sum, e) => sum + monthlyAmount(e.amount, e.frequency as Frequency), 0)

  if (totalExpense > totalIncome) {
    return [
      {
        code: 'expense_exceeds_income',
        messageKey: 'expense_exceeds_income',
        entityId: scenarioId,
        entityName: scenarioName,
        entityType: 'scenario',
      },
    ]
  }
  return []
}

export const validateScenario = (scenario: Scenario): Warning[] => {
  const ctx: ValidationContext = {
    assets: scenario.entities.assets,
    liabilities: scenario.entities.liabilities,
    incomes: scenario.entities.incomes,
    expenses: scenario.entities.expenses,
  }
  const out: Warning[] = []
  for (const a of scenario.entities.assets) out.push(...checkAsset(a))
  for (const l of scenario.entities.liabilities) out.push(...checkLiability(l, ctx))
  out.push(
    ...checkBurnRate(
      scenario.id,
      scenario.name,
      scenario.entities.incomes,
      scenario.entities.expenses,
    ),
  )
  return out
}

