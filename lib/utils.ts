import type { Warning } from '@/core/validation/warnings'
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RouteLocationRaw } from 'vue-router'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const entityRoute = (scenarioId: string, w: Warning): RouteLocationRaw => {
  const query: Record<string, string> = { scenario: scenarioId }
  if (w.entityType !== 'scenario') query.expand = w.entityId
  return { name: 'entities', query }
}
