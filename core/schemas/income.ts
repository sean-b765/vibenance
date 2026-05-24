import { z } from 'zod'
import { frequencySchema } from '@/core/schemas/frequency'

export const incomeTypeSchema = z.enum([
  'wage',
  'winnings',
  'inheritance',
  'rental',
  'other',
])

export const incomeSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    type: incomeTypeSchema,
    amount: z.number(),
    destinationAccountId: z.string().uuid(),
    frequency: frequencySchema.nullable(),
    paymentDate: z.string().datetime().optional(),
    pretax: z.boolean(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    tagIds: z.array(z.string().uuid()),
  })
  .superRefine((i, ctx) => {
    if (i.endDate && i.endDate <= i.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      })
    }
    if (!i.frequency && !i.paymentDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequency'],
        message: 'Income requires either a frequency or a one-off payment date',
      })
    }
  })

export type IncomeType = z.infer<typeof incomeTypeSchema>
export type Income = z.infer<typeof incomeSchema>
