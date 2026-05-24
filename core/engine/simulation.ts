import { applyCashFlows, applyLoanRepayments } from '@/core/engine/cashflow'
import { stepDay, type InterestState } from '@/core/engine/interest'
import { stepLoanDay } from '@/core/engine/loan'
import type { SeriesPoint } from '@/core/engine/series'
import { latest } from '@/core/engine/snapshots'
import type { Asset } from '@/core/schemas/asset'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'

const MS_PER_DAY = 86_400_000

export type EntitySeries = {
  id: string
  name: string
  kind: 'asset' | 'liability'
  points: SeriesPoint[]
}

export type SimulationResult = {
  series: SeriesPoint[]
  entities: EntitySeries[]
}

type EntityState = Map<string, InterestState>

const initialBalance = (snapshots: { date: string; value: number }[], date: string): number =>
  latest(snapshots as Parameters<typeof latest>[0], date)?.value ?? 0

const seedState = (
  entities: Array<{ id: string; snapshots: { date: string; value: number }[] }>,
  startDate: string,
): EntityState => {
  const map: EntityState = new Map()
  for (const e of entities) {
    map.set(e.id, { balance: initialBalance(e.snapshots, startDate), accruedInterest: 0 })
  }
  return map
}

const stepEntities = <T extends { id: string; startDate: string; snapshots: { date: string; value: number }[] }>(
  state: EntityState,
  entities: T[],
  growthOf: (entity: T) => Asset['growth'],
  currentDate: string,
): void => {
  for (const e of entities) {
    const current = state.get(e.id) ?? { balance: 0, accruedInterest: 0 }
    state.set(e.id, stepDay(current, growthOf(e), e.startDate, currentDate))
  }
}

const buildOffsetIndex = (assets: Asset[]): Map<string, string[]> => {
  const index = new Map<string, string[]>()
  for (const a of assets) {
    if (a.type !== 'account_offset' || !a.linkedLiabilityId) continue
    const list = index.get(a.linkedLiabilityId) ?? []
    list.push(a.id)
    index.set(a.linkedLiabilityId, list)
  }
  return index
}

const stepLiabilities = (
  liabilityState: EntityState,
  liabilities: Liability[],
  assetState: EntityState,
  offsetIndex: Map<string, string[]>,
  currentDate: string,
): void => {
  for (const l of liabilities) {
    const current = liabilityState.get(l.id) ?? { balance: 0, accruedInterest: 0 }
    const offsetIds = offsetIndex.get(l.id) ?? []
    const offsetBalances = offsetIds.map((id) => assetState.get(id)?.balance ?? 0)
    liabilityState.set(l.id, stepLoanDay(current, l.interest, offsetBalances, l.startDate, currentDate))
  }
}

const totalValue = (state: EntityState): number => {
  let sum = 0
  for (const s of state.values()) sum += s.balance + s.accruedInterest
  return sum
}

const entityValue = (state: EntityState, id: string): number => {
  const s = state.get(id)
  if (!s) return 0
  return s.balance + s.accruedInterest
}

const eachDay = (from: string, to: string): string[] => {
  const fromMs = Date.parse(from)
  const toMs = Date.parse(to)
  if (fromMs > toMs) return []
  const days: string[] = []
  for (let ms = fromMs; ms <= toMs; ms += MS_PER_DAY) {
    days.push(new Date(ms).toISOString())
  }
  return days
}

const buildEntitySeriesShells = (
  assets: Asset[],
  liabilities: Liability[],
): EntitySeries[] => [
  ...assets.map((a) => ({ id: a.id, name: a.name, kind: 'asset' as const, points: [] })),
  ...liabilities.map((l) => ({ id: l.id, name: l.name, kind: 'liability' as const, points: [] })),
]

export const simulate = (scenario: Scenario, fromDate: string, toDate: string): SimulationResult => {
  const { assets, liabilities } = scenario.entities

  const assetState = seedState(assets, fromDate)
  const liabilityState = seedState(liabilities, fromDate)

  const series: SeriesPoint[] = []
  const entities = buildEntitySeriesShells(assets, liabilities)
  const offsetIndex = buildOffsetIndex(assets)

  for (const day of eachDay(fromDate, toDate)) {
    if (day !== fromDate) {
      stepEntities<Asset>(assetState, assets, (a) => a.growth, day)
      stepLiabilities(liabilityState, liabilities, assetState, offsetIndex, day)
      applyCashFlows(day, scenario, assetState)
      applyLoanRepayments(day, scenario, assetState, liabilityState)
    }

    series.push({
      date: day,
      value: totalValue(assetState) - totalValue(liabilityState),
    })

    for (const e of entities) {
      const state = e.kind === 'asset' ? assetState : liabilityState
      e.points.push({ date: day, value: entityValue(state, e.id) })
    }
  }

  return { series, entities }
}
