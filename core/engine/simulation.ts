import { stepDay, type InterestState } from '@/core/engine/interest'
import type { SeriesPoint } from '@/core/engine/series'
import { latest } from '@/core/engine/snapshots'
import type { Asset } from '@/core/schemas/asset'
import type { Liability } from '@/core/schemas/liability'
import type { Scenario } from '@/core/schemas/scenario'

const MS_PER_DAY = 86_400_000

export type SimulationResult = {
  series: SeriesPoint[]
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

const totalValue = (state: EntityState): number => {
  let sum = 0
  for (const s of state.values()) sum += s.balance + s.accruedInterest
  return sum
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

export const simulate = (scenario: Scenario, fromDate: string, toDate: string): SimulationResult => {
  const { assets, liabilities } = scenario.entities

  const assetState = seedState(assets, fromDate)
  const liabilityState = seedState(liabilities, fromDate)

  const series: SeriesPoint[] = []

  for (const day of eachDay(fromDate, toDate)) {
    if (day !== fromDate) {
      stepEntities<Asset>(assetState, assets, (a) => a.growth, day)
      stepEntities<Liability>(liabilityState, liabilities, (l) => l.interest, day)
    }

    series.push({
      date: day,
      value: totalValue(assetState) - totalValue(liabilityState),
    })
  }

  return { series }
}
