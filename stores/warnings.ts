import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'
import {
  checkAsset,
  checkBurnRate,
  checkLiability,
  validateScenario,
  type ValidationContext,
  type Warning,
} from '@/core/validation/warnings'
import { useScenariosStore } from '@/stores/scenarios'

export const useWarningsStore = defineStore('warnings', () => {
  const scenarios = useScenariosStore()

  const warningsByScenario = computed<Record<string, Warning[]>>(() => {
    const out: Record<string, Warning[]> = {}
    for (const s of scenarios.scenarios) {
      out[s.id] = validateScenario(s)
    }
    return out
  })

  const favouriteWarnings = computed<{ scenario: Scenario; warnings: Warning[] }[]>(() =>
    scenarios.favourites.map((s) => ({
      scenario: s,
      warnings: warningsByScenario.value[s.id] ?? [],
    })),
  )

  const activeScenarioWarnings = computed<Warning[]>(() => {
    const id = scenarios.activeScenario?.id
    return id ? (warningsByScenario.value[id] ?? []) : []
  })

  const ctxFor = (scenario: Scenario): ValidationContext => ({
    assets: scenario.entities.assets,
    liabilities: scenario.entities.liabilities,
    incomes: scenario.entities.incomes,
    expenses: scenario.entities.expenses,
  })

  const checkAssetDraft = (scenario: Scenario, draft: Asset): Warning[] =>
    checkAsset(draft)

  const checkLiabilityDraft = (scenario: Scenario, draft: Liability): Warning[] => {
    const ctx = ctxFor(scenario)
    const swapped: ValidationContext = {
      ...ctx,
      liabilities: ctx.liabilities.map((l) => (l.id === draft.id ? draft : l)),
    }
    return checkLiability(draft, swapped)
  }

  const checkIncomeDraft = (scenario: Scenario, draft: Income): Warning[] => {
    const incomes = scenario.entities.incomes.map((i) => (i.id === draft.id ? draft : i))
    if (!incomes.find((i) => i.id === draft.id)) incomes.push(draft)
    return checkBurnRate(scenario.id, scenario.name, incomes, scenario.entities.expenses)
  }

  const checkExpenseDraft = (scenario: Scenario, draft: Expense): Warning[] => {
    const expenses = scenario.entities.expenses.map((e) => (e.id === draft.id ? draft : e))
    if (!expenses.find((e) => e.id === draft.id)) expenses.push(draft)
    return checkBurnRate(scenario.id, scenario.name, scenario.entities.incomes, expenses)
  }

  return {
    warningsByScenario,
    favouriteWarnings,
    activeScenarioWarnings,
    checkAssetDraft,
    checkLiabilityDraft,
    checkIncomeDraft,
    checkExpenseDraft,
  }
})
