export type SeriesPoint = {
  date: string
  value: number
}

export type BucketKind = 'day' | 'week' | 'month'

const MS_PER_DAY = 86_400_000

const isoWeekKey = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

const bucketKey = (date: Date, kind: BucketKind): string => {
  switch (kind) {
    case 'day':
      return date.toISOString().slice(0, 10)
    case 'week':
      return isoWeekKey(date)
    case 'month':
      return monthKey(date)
  }
}

export const bucket = (series: SeriesPoint[], kind: BucketKind): SeriesPoint[] => {
  if (kind === 'day') return [...series]

  const lastPerBucket = new Map<string, SeriesPoint>()
  const orderedKeys: string[] = []

  for (const p of series) {
    const key = bucketKey(new Date(p.date), kind)
    if (!lastPerBucket.has(key)) orderedKeys.push(key)
    lastPerBucket.set(key, p)
  }

  return orderedKeys.map((k) => lastPerBucket.get(k) as SeriesPoint)
}
