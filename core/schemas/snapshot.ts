import { z } from 'zod'

export const snapshotSchema = z.object({
  date: z.string().datetime(),
  value: z.number(),
  actual: z.boolean(),
})

export type Snapshot = z.infer<typeof snapshotSchema>
