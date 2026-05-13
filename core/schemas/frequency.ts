import { z } from 'zod'

export const frequencyKindSchema = z.enum([
  'daily',
  'weekly',
  'fortnightly',
  'monthly',
  'annually',
])

export const frequencySchema = z.object({
  kind: frequencyKindSchema,
})

export type FrequencyKind = z.infer<typeof frequencyKindSchema>
export type Frequency = z.infer<typeof frequencySchema>
