import { uuidv7 } from 'uuidv7'
import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'
import type { Tag } from '@/core/schemas/tag'

const today = (): string => new Date().toISOString()
const isoOf = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month - 1, day)).toISOString()

export const systemTags = (): Tag[] => [
  { id: uuidv7(), name: 'Asset', colour: '#10b981', system: true },
  { id: uuidv7(), name: 'Liability', colour: '#ef4444', system: true },
  { id: uuidv7(), name: 'Income', colour: '#3b82f6', system: true },
  { id: uuidv7(), name: 'Expense', colour: '#f59e0b', system: true },
  { id: uuidv7(), name: 'Transfer', colour: '#8b5cf6', system: true },
]

export const buildSampleScenario = (): Scenario => {
  const start = isoOf(2026, 1, 1)
  const now = today()

  const cashId = uuidv7()
  const savingsId = uuidv7()
  const offsetId = uuidv7()
  const investId = uuidv7()
  const propertyId = uuidv7()
  const mortgageId = uuidv7()
  const creditCardId = uuidv7()

  const assets: Asset[] = [
    {
      id: cashId,
      name: 'Everyday Cash',
      type: 'account_cash',
      startDate: start,
      snapshots: [{ date: now, value: 5_000, actual: true }],
      growth: { type: 'simple', rate: 0 },
      tagIds: [],
    },
    {
      id: savingsId,
      name: 'High-Interest Savings',
      type: 'account_savings',
      startDate: start,
      snapshots: [{ date: now, value: 30_000, actual: true }],
      growth: { type: 'compounding', rate: 0.045, compoundingFrequency: { kind: 'monthly' } },
      tagIds: [],
    },
    {
      id: offsetId,
      name: 'Home Loan Offset',
      type: 'account_offset',
      startDate: start,
      snapshots: [{ date: now, value: 80_000, actual: true }],
      growth: { type: 'simple', rate: 0 },
      linkedLiabilityId: mortgageId,
      tagIds: [],
    },
    {
      id: investId,
      name: 'Investment Account',
      type: 'account_investment',
      startDate: start,
      snapshots: [{ date: now, value: 50_000, actual: true }],
      growth: { type: 'compounding', rate: 0.07, compoundingFrequency: { kind: 'monthly' } },
      tagIds: [],
    },
    {
      id: propertyId,
      name: 'Primary Residence',
      type: 'property',
      startDate: start,
      snapshots: [{ date: now, value: 900_000, actual: true }],
      growth: { type: 'compounding', rate: 0.04, compoundingFrequency: { kind: 'annually' } },
      tagIds: [],
    },
  ]

  const liabilities: Liability[] = [
    {
      id: mortgageId,
      name: 'Home Loan',
      type: 'mortgage',
      startDate: start,
      snapshots: [{ date: now, value: 600_000, actual: true }],
      interest: { type: 'compounding', rate: 0.06, compoundingFrequency: { kind: 'monthly' } },
      repayment: 4_000,
      paymentFrequency: { kind: 'monthly' },
      sourceAccountId: cashId,
      tagIds: [],
    },
    {
      id: creditCardId,
      name: 'Credit Card',
      type: 'credit_card',
      startDate: start,
      snapshots: [{ date: now, value: 0, actual: true }],
      interest: { type: 'simple', rate: 0.2099 },
      repayment: 0,
      paymentFrequency: { kind: 'monthly' },
      sourceAccountId: cashId,
      creditCardGracePeriodDays: 55,
      creditCardRevolving: false,
      tagIds: [],
    },
  ]

  const incomes: Income[] = [
    {
      id: uuidv7(),
      name: 'Salary',
      type: 'wage',
      amount: 120_000 / 26,
      pretax: true,
      destinationAccountId: cashId,
      frequency: { kind: 'fortnightly' },
      startDate: start,
      tagIds: [],
    },
  ]

  const expenses: Expense[] = [
    {
      id: uuidv7(),
      name: 'Groceries',
      type: 'food',
      amount: 200,
      sourceAccountId: cashId,
      frequency: { kind: 'weekly' },
      paymentDate: start,
      fixed: false,
      startDate: start,
      tagIds: [],
    },
    {
      id: uuidv7(),
      name: 'Utilities',
      type: 'utilities',
      amount: 350,
      sourceAccountId: cashId,
      frequency: { kind: 'monthly' },
      paymentDate: start,
      fixed: true,
      startDate: start,
      tagIds: [],
    },
    {
      id: uuidv7(),
      name: 'Insurance',
      type: 'insurance',
      amount: 180,
      sourceAccountId: cashId,
      frequency: { kind: 'monthly' },
      paymentDate: start,
      fixed: true,
      startDate: start,
      tagIds: [],
    },
    {
      id: uuidv7(),
      name: 'Fuel',
      type: 'transport',
      amount: 80,
      sourceAccountId: cashId,
      frequency: { kind: 'weekly' },
      paymentDate: start,
      fixed: false,
      startDate: start,
      tagIds: [],
    },
  ]

  return {
    id: uuidv7(),
    name: 'Base',
    colour: '#3b82f6',
    favourite: true,
    horizonYears: 30,
    inflationRate: 0.025,
    entities: { assets, liabilities, incomes, expenses, transfers: [] },
  }
}

export const buildExtraSampleScenario = (): Scenario => {
  const base = buildSampleScenario()
  const mortgage = base.entities.liabilities.find((l) => l.type === 'mortgage')
  if (mortgage) mortgage.repayment += 500
  return {
    ...base,
    id: uuidv7(),
    name: 'Pay extra $500/mo on mortgage',
    colour: '#10b981',
    favourite: false,
  }
}
