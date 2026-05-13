import { latest } from '@/core/engine/snapshots'
import type { Asset } from '@/core/schemas/asset'
import type { Liability } from '@/core/schemas/liability'

const valueAt = (entity: { snapshots: { date: string; value: number; actual: boolean }[] }, date: string): number =>
  latest(entity.snapshots, date)?.value ?? 0

export const compute = (assets: Asset[], liabilities: Liability[], date: string): number => {
  const assetTotal = assets.reduce((sum, a) => sum + valueAt(a, date), 0)
  const liabilityTotal = liabilities.reduce((sum, l) => sum + valueAt(l, date), 0)
  return assetTotal - liabilityTotal
}
