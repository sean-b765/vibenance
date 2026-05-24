import { z } from 'zod'
import { frequencySchema } from '@/core/schemas/frequency'
import { growthSchema } from '@/core/schemas/growth'
import { snapshotSchema } from '@/core/schemas/snapshot'

export const liabilityTypeSchema = z.enum([
  'mortgage',
  'personal_loan',
  'credit_card',
  'car_loan',
])

export const liabilitySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    type: liabilityTypeSchema,
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    snapshots: z.array(snapshotSchema),
    interest: growthSchema,
    repayment: z.number().nonnegative(),
    paymentFrequency: frequencySchema,
    sourceAccountId: z.string().uuid(),
    creditCardGracePeriodDays: z.number().int().nonnegative().optional(),
    creditCardRevolving: z.boolean().optional(),
    tagIds: z.array(z.string().uuid()),
  })
  .superRefine((l, ctx) => {
    if (l.endDate && l.endDate <= l.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      })
    }
    l.snapshots.forEach((s, i) => {
      if (s.date < l.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['snapshots', i, 'date'],
          message: 'Snapshot date must be on or after entity start date',
        })
      }
    })
  })

export type LiabilityType = z.infer<typeof liabilityTypeSchema>
export type Liability = z.infer<typeof liabilitySchema>
