import { exportBundleSchema, type ExportBundle } from '@/core/schemas/exportBundle'
import type { Scenario } from '@/core/schemas/scenario'
import type { Settings } from '@/core/schemas/settings'
import type { Tag } from '@/core/schemas/tag'

export const SCHEMA_VERSION = 1

export type BundleInput = {
  scenarios: Scenario[]
  tags: Tag[]
  settings: Settings
}

export const serializeBundle = (input: BundleInput): string => {
  const bundle: ExportBundle = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scenarios: input.scenarios,
    tags: input.tags,
    settings: input.settings,
  }
  return JSON.stringify(bundle, null, 2)
}

export const parseBundle = (text: string): ExportBundle => {
  const parsed = JSON.parse(text)
  const bundle = exportBundleSchema.parse(parsed)
  if (bundle.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported export version: ${bundle.version} (expected ${SCHEMA_VERSION})`)
  }
  return bundle
}
