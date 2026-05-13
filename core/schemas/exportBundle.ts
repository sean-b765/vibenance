import { z } from 'zod'
import { scenarioSchema } from '@/core/schemas/scenario'
import { settingsSchema } from '@/core/schemas/settings'
import { tagSchema } from '@/core/schemas/tag'

export const exportBundleSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  scenarios: z.array(scenarioSchema),
  tags: z.array(tagSchema),
  settings: settingsSchema,
})

export type ExportBundle = z.infer<typeof exportBundleSchema>
