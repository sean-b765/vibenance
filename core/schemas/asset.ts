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

export const assetSchema = z
  .object({
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
  .superRefine((a, ctx) => {
    if (a.endDate && a.endDate <= a.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      })
    }
    a.snapshots.forEach((s, i) => {
      if (s.date < a.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['snapshots', i, 'date'],
          message: 'Snapshot date must be on or after entity start date',
        })
      }
    })
  })

export type AssetType = z.infer<typeof assetTypeSchema>
export type Asset = z.infer<typeof assetSchema>
