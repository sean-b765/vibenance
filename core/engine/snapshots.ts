import type { Snapshot } from '@/core/schemas/snapshot'

export const latest = (snapshots: Snapshot[], date: string): Snapshot | undefined => {
  const targetMs = Date.parse(date)
  let best: Snapshot | undefined

  for (const snapshot of snapshots) {
    const ms = Date.parse(snapshot.date)
    if (ms > targetMs) continue
    if (best === undefined || ms > Date.parse(best.date)) {
      best = snapshot
    }
  }

  return best
}
