import { z } from 'zod'
import { growthSchema } from '@/core/schemas/growth'
import { snapshotSchema } from '@/core/schemas/snapshot'

export const assetTypeSchema = z.enum([
  'account_cash',
  'account_savings',
  'account_offset',
  'account_investment',
  'property',
  'vehicle',
])

export const assetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: assetTypeSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  snapshots: z.array(snapshotSchema),
  growth: growthSchema,
  linkedLiabilityId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()),
})

export type AssetType = z.infer<typeof assetTypeSchema>
export type Asset = z.infer<typeof assetSchema>
