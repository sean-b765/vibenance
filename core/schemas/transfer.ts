import { z } from 'zod'
import { frequencySchema } from '@/core/schemas/frequency'

export const transferTypeSchema = z.enum(['one-off', 'ongoing'])

export const transferSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: transferTypeSchema,
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: z.number(),
  frequency: frequencySchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  tagIds: z.array(z.string().uuid()),
})

export type TransferType = z.infer<typeof transferTypeSchema>
export type Transfer = z.infer<typeof transferSchema>
