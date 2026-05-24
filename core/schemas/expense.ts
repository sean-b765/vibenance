import { z } from 'zod'
import { frequencySchema } from '@/core/schemas/frequency'

export const expenseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    type: z.string().min(1),
    amount: z.number(),
    sourceAccountId: z.string().uuid(),
    frequency: frequencySchema.nullable(),
    paymentDate: z.string().datetime(),
    fixed: z.boolean(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    tagIds: z.array(z.string().uuid()),
  })
  .superRefine((e, ctx) => {
    if (e.endDate && e.endDate <= e.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      })
    }
  })

export type Expense = z.infer<typeof expenseSchema>
