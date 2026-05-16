import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import { loadKv, saveKv } from '@/core/db'
import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario, ScenarioEntities } from '@/core/schemas/scenario'
import type { Transfer } from '@/core/schemas/transfer'
import { buildExtraSampleScenario, buildSampleScenario } from '@/utils/sampleData'

type EntityKey = keyof ScenarioEntities

const emptyEntities = () => ({
  assets: [],
  liabilities: [],
  incomes: [],
  expenses: [],
  transfers: [],
})

const newScenario = (name: string): Scenario => ({
  id: uuidv7(),
  name,
  colour: '#3b82f6',
  favourite: false,
  horizonYears: 30,
  inflationRate: 0.025,
  entities: emptyEntities(),
})

export const useScenariosStore = defineStore('scenarios', () => {
  const scenarios = ref<Scenario[]>([])
  const activeScenarioId = ref<string | null>(null)

  const activeScenario = computed(() => {
    const explicit = scenarios.value.find((s) => s.id === activeScenarioId.value)
    if (explicit) return explicit
    return scenarios.value[0] ?? null
  })
  const favourites = computed(() => scenarios.value.filter((s) => s.favourite))
  const hasData = computed(() => scenarios.value.length > 0)

  const loadSampleData = () => {
    const base = buildSampleScenario()
    const extra = buildExtraSampleScenario()
    scenarios.value = [base, extra]
    activeScenarioId.value = base.id
  }

  const ensureBaseScenario = () => {
    if (scenarios.value.length > 0) return
    const base = newScenario('Base')
    base.favourite = true
    scenarios.value = [base]
    activeScenarioId.value = base.id
  }

  const create = (name: string): Scenario => {
    const s = newScenario(name)
    scenarios.value.push(s)
    return s
  }

  const duplicate = (id: string): Scenario | null => {
    const src = scenarios.value.find((s) => s.id === id)
    if (!src) return null
    const copy: Scenario = JSON.parse(JSON.stringify(src))
    copy.id = uuidv7()
    copy.name = `${src.name} (copy)`
    copy.favourite = false
    scenarios.value.push(copy)
    return copy
  }

  const rename = (id: string, name: string) => {
    const s = scenarios.value.find((s) => s.id === id)
    if (!s) return
    s.name = name
  }

  const remove = (id: string) => {
    const s = scenarios.value.find((s) => s.id === id)
    if (!s || s.name === 'Base') return
    scenarios.value = scenarios.value.filter((s) => s.id !== id)
    if (activeScenarioId.value === id) {
      activeScenarioId.value = scenarios.value[0]?.id ?? null
    }
  }

  const toggleFavourite = (id: string) => {
    const s = scenarios.value.find((s) => s.id === id)
    if (!s) return
    s.favourite = !s.favourite
  }

  const setColour = (id: string, colour: string) => {
    const s = scenarios.value.find((s) => s.id === id)
    if (!s) return
    s.colour = colour
  }

  const setActive = (id: string) => {
    activeScenarioId.value = id
  }

  const reset = () => {
    scenarios.value = []
    activeScenarioId.value = null
  }

  let persistenceEnabled = false
  const enablePersistence = async () => {
    if (persistenceEnabled) return
    persistenceEnabled = true
    const stored = await loadKv<Scenario[]>('scenarios')
    if (stored) scenarios.value = stored
    const active = await loadKv<string | null>('activeScenarioId')
    if (active !== undefined) activeScenarioId.value = active
    watch(
      scenarios,
      (v) => {
        void saveKv('scenarios', JSON.parse(JSON.stringify(v)))
      },
      { deep: true },
    )
    watch(activeScenarioId, (v) => {
      void saveKv('activeScenarioId', v)
    })
  }

  const scenarioById = (id: string) => scenarios.value.find((s) => s.id === id)

  const upsertEntity = <K extends EntityKey>(
    scenarioId: string,
    key: K,
    entity: ScenarioEntities[K][number],
  ) => {
    const s = scenarioById(scenarioId)
    if (!s) return
    const list = s.entities[key] as Array<{ id: string }>
    const idx = list.findIndex((e) => e.id === entity.id)
    if (idx >= 0) list.splice(idx, 1, entity)
    else list.push(entity)
  }

  const removeEntity = (scenarioId: string, key: EntityKey, entityId: string) => {
    const s = scenarioById(scenarioId)
    if (!s) return
    switch (key) {
      case 'assets':
        s.entities.assets = s.entities.assets.filter((e) => e.id !== entityId)
        return
      case 'liabilities':
        s.entities.liabilities = s.entities.liabilities.filter((e) => e.id !== entityId)
        return
      case 'incomes':
        s.entities.incomes = s.entities.incomes.filter((e) => e.id !== entityId)
        return
      case 'expenses':
        s.entities.expenses = s.entities.expenses.filter((e) => e.id !== entityId)
        return
      case 'transfers':
        s.entities.transfers = s.entities.transfers.filter((e) => e.id !== entityId)
        return
    }
  }

  const upsertAsset = (scenarioId: string, asset: Asset) =>
    upsertEntity(scenarioId, 'assets', asset)
  const upsertLiability = (scenarioId: string, liability: Liability) =>
    upsertEntity(scenarioId, 'liabilities', liability)
  const upsertIncome = (scenarioId: string, income: Income) =>
    upsertEntity(scenarioId, 'incomes', income)
  const upsertExpense = (scenarioId: string, expense: Expense) =>
    upsertEntity(scenarioId, 'expenses', expense)
  const upsertTransfer = (scenarioId: string, transfer: Transfer) =>
    upsertEntity(scenarioId, 'transfers', transfer)

  const findEntity = <K extends EntityKey>(
    scenarioId: string,
    key: K,
    entityId: string,
  ): ScenarioEntities[K][number] | undefined => {
    const s = scenarioById(scenarioId)
    if (!s) return undefined
    const list = s.entities[key] as Array<{ id: string }>
    return list.find((e) => e.id === entityId) as ScenarioEntities[K][number] | undefined
  }

  const moveEntity = <K extends EntityKey>(
    fromScenarioId: string,
    toScenarioId: string,
    key: K,
    entityId: string,
  ) => {
    if (fromScenarioId === toScenarioId) return
    const ent = findEntity(fromScenarioId, key, entityId)
    if (!ent) return
    upsertEntity(toScenarioId, key, ent)
    removeEntity(fromScenarioId, key, entityId)
  }

  const cloneEntity = <K extends EntityKey>(
    fromScenarioId: string,
    toScenarioId: string,
    key: K,
    entityId: string,
  ): ScenarioEntities[K][number] | null => {
    const ent = findEntity(fromScenarioId, key, entityId)
    if (!ent) return null
    const copy = JSON.parse(JSON.stringify(ent)) as ScenarioEntities[K][number] & { id: string }
    copy.id = uuidv7()
    upsertEntity(toScenarioId, key, copy)
    return copy
  }

  const appendSnapshot = (
    scenarioId: string,
    kind: 'assets' | 'liabilities',
    entityId: string,
    value: number,
  ) => {
    const s = scenarioById(scenarioId)
    if (!s) return
    const list = s.entities[kind] as Array<{ id: string; snapshots: { date: string; value: number; actual: boolean }[] }>
    const ent = list.find((e) => e.id === entityId)
    if (!ent) return
    ent.snapshots.push({ date: new Date().toISOString(), value, actual: true })
  }

  return {
    scenarios,
    activeScenarioId,
    activeScenario,
    favourites,
    hasData,
    loadSampleData,
    ensureBaseScenario,
    create,
    duplicate,
    rename,
    remove,
    toggleFavourite,
    setColour,
    setActive,
    reset,
    upsertAsset,
    upsertLiability,
    upsertIncome,
    upsertExpense,
    upsertTransfer,
    removeEntity,
    appendSnapshot,
    moveEntity,
    cloneEntity,
    enablePersistence,
  }
})
