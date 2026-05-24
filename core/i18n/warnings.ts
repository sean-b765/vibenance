export type WarningCode =
  | 'snapshot_negative'
  | 'negative_amortisation'
  | 'repayment_zero'
  | 'expense_exceeds_income'
  | 'liability_orphan'

const messages: Record<WarningCode, string> = {
  snapshot_negative: 'snapshot value is negative',
  negative_amortisation: 'repayment less than monthly interest accrual',
  repayment_zero: 'repayment is zero with outstanding balance',
  expense_exceeds_income: 'total expenses exceed total income',
  liability_orphan: '{type} not linked to any asset',
}

const interpolate = (template: string, params?: Record<string, unknown>): string => {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

export const renderWarning = (
  entityName: string,
  code: WarningCode,
  params?: Record<string, unknown>,
): string => {
  const body = interpolate(messages[code], params)
  return `${entityName}: ${body}.`
}

export const warningMessage = (code: WarningCode): string => messages[code]
