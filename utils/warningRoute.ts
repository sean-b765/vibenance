import type { RouteLocationRaw } from 'vue-router'
import type { Warning } from '@/core/validation/warnings'

export const warningRoute = (scenarioId: string, w: Warning): RouteLocationRaw => {
  const query: Record<string, string> = { scenario: scenarioId }
  if (w.entityType !== 'scenario') query.expand = w.entityId
  return { name: 'entities', query }
}
