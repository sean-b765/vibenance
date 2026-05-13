import { z } from 'zod'
import { frequencySchema } from '@/core/schemas/frequency'

export const growthTypeSchema = z.enum(['simple', 'compounding'])

export const ratePeriodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  rate: z.number(),
})

export const growthSchema = z.object({
  type: growthTypeSchema,
  compoundingFrequency: frequencySchema.optional(),
  rate: z.number(),
  variableRates: z.array(ratePeriodSchema).optional(),
})

export type GrowthType = z.infer<typeof growthTypeSchema>
export type RatePeriod = z.infer<typeof ratePeriodSchema>
export type Growth = z.infer<typeof growthSchema>
